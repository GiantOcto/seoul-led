const path = require('path');
const fs = require('fs');
// server.js 와 같은 폴더의 .env (배치가 프로젝트 루트여도 server\.env 적용)
require('dotenv').config({ path: path.join(__dirname, '.env') });

/** React 빌드 폴더 (없으면 API만 동작). 우선순위: STATIC_DIR → ../build → ../client/build */
function resolveStaticRoot() {
    if (process.env.STATIC_DIR) {
        const p = path.isAbsolute(process.env.STATIC_DIR)
            ? process.env.STATIC_DIR
            : path.join(__dirname, '..', process.env.STATIC_DIR);
        if (fs.existsSync(path.join(p, 'index.html'))) return p;
    }
    const candidates = [
        path.join(__dirname, '..', 'build'),
        path.join(__dirname, '..', 'client', 'build'),
    ];
    for (const c of candidates) {
        if (fs.existsSync(path.join(c, 'index.html'))) return c;
    }
    return null;
}

const express = require('express');
const dgram = require('dgram');
const { startPlcModbusPoller, getModbusStatus } = require('./plc-modbus-poller');
const { logWaterLevel } = require('./water-level-logger');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling']
    },
    allowEIO3: true
});

const cors = require('cors');

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 연결된 클라이언트 관리
let connectedClients = new Set();

const WATER_LEVEL_POLL_MS = parseInt(process.env.WATER_LEVEL_POLL_MS || '500', 10);
const RELAY_EVENT_UDP_PORT = parseInt(process.env.RELAY_EVENT_UDP_PORT || '19031', 10);

const RelayState = {
    relay1On: false,
    relay2On: false,
    reducing: false,
    lastReceivedAt: null,
};

/** 최근 1분치 데이터만 메모리 보관 (폴링 주기 기준 동적 계산). 그래프 미사용, 클라는 마지막 1건만 사용 */
const MAX_DATA_POINTS = Math.max(
    1,
    Math.floor(60_000 / Math.max(100, WATER_LEVEL_POLL_MS))
);

const DataStore = {
    data: [],

    // _ts(ms)를 함께 저장해 이진탐색 시 Date 파싱 생략
    addData(newData) {
        this.data.push({ ...newData, _ts: new Date(newData.timestamp).getTime() });
        if (this.data.length > MAX_DATA_POINTS) {
            this.data = this.data.slice(-MAX_DATA_POINTS);
        }
    },

    binarySearchTimestamp(targetMs) {
        let left = 0, right = this.data.length - 1;
        while (left <= right) {
            const mid = (left + right) >> 1;
            const t = this.data[mid]._ts;
            if (t === targetMs) return mid;
            if (t < targetMs) left = mid + 1;
            else right = mid - 1;
        }
        return left;
    },

    getData() {
        return this.data;
    },

    getDataInRange(startTime, endTime) {
        const startIndex = this.binarySearchTimestamp(startTime);
        const endIndex = this.binarySearchTimestamp(endTime);
        return this.data.slice(startIndex, endIndex + 1);
    }
};

function isValidModbusData(data) {
    try {
        if (!data || typeof data !== 'object' || data.source !== 'modbus') return false;

        if (!data.timestamp || isNaN(new Date(data.timestamp).getTime())) {
            return false;
        }

        if (!Number.isInteger(data.water_level) || data.water_level < 0) {
            return false;
        }

        if (data.water_level > 9999) return false;
        if (!Number.isInteger(data.error_code) || ![0, 1, 2].includes(data.error_code)) {
            return false;
        }
        if (typeof data.machine_status !== 'boolean') return false;
        if (data.sensor_error_bits !== undefined) {
            const sensorCount = Math.max(1, parseInt(process.env.PLC_SENSOR_COUNT || '10', 10));
            if (!Array.isArray(data.sensor_error_bits) || data.sensor_error_bits.length !== sensorCount) {
                return false;
            }
            for (const b of data.sensor_error_bits) {
                if (typeof b !== 'boolean') return false;
            }
        }
        return true;
    } catch (error) {
        console.error('Data validation error', error);
        return false;
    }
}

/** 저장 + 브로드캐스트 (Modbus → Socket.IO) */
function ingestSerialPayload(data) {
    if (!isValidModbusData(data)) {
        console.error('Invalid modbus data:', data);
        return false;
    }
    if (process.env.NODE_ENV === 'development') console.log('[modbus] 수신:', data);
    DataStore.addData(data);
    logWaterLevel(data); // CSV 기록 (내부에서 1분 스로틀)
    io.emit('new_data', data);
    return true;
}

function setRelayReducing(nextReducing, source) {
    const changed = RelayState.reducing !== nextReducing;
    RelayState.reducing = nextReducing;
    if (!changed) return;
    io.emit('relay_reduction_status', {
        reducing: RelayState.reducing,
        relay1On: RelayState.relay1On,
        relay2On: RelayState.relay2On,
        lastReceivedAt: RelayState.lastReceivedAt,
        source,
    });
}

function startRelayUdpListener() {
    const socket = dgram.createSocket('udp4');

    socket.on('message', (msg, rinfo) => {
        try {
            const payload = JSON.parse(msg.toString('utf8'));
            if (!payload || payload.type !== 'relay_status_changed') return;

            RelayState.relay1On = Boolean(payload.relay1On);
            RelayState.relay2On = Boolean(payload.relay2On);
            RelayState.lastReceivedAt = new Date().toISOString();

            // relay1 ON → 저감중, relay1 OFF UDP 올 때까지 유지 (타임아웃 없음)
            if (RelayState.relay1On) {
                setRelayReducing(true, `udp:${rinfo.address}:${rinfo.port}`);
            } else {
                setRelayReducing(false, `udp:${rinfo.address}:${rinfo.port}`);
            }
        } catch (err) {
            console.warn('[relay-udp] parse 실패:', err.message);
        }
    });

    socket.on('error', (err) => {
        console.error('[relay-udp] 소켓 오류:', err.message);
    });

    socket.bind(RELAY_EVENT_UDP_PORT, '127.0.0.1', () => {
        console.log(`[relay-udp] listening 127.0.0.1:${RELAY_EVENT_UDP_PORT}`);
    });
}

// Socket.IO 연결 처리
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    connectedClients.add(socket.id);

    // 클라이언트에 현재 데이터 전송
    try {
        socket.emit('initial_data', DataStore.getData());
        socket.emit('relay_reduction_status', {
            reducing: RelayState.reducing,
            relay1On: RelayState.relay1On,
            relay2On: RelayState.relay2On,
            lastReceivedAt: RelayState.lastReceivedAt,
            source: 'initial',
        });
    } catch (err) {
        console.error('[socket] initial_data 전송 오류:', err.message);
    }

    // 연결 해제 처리
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        connectedClients.delete(socket.id);
    });
});

// REST API 엔드포인트
app.get('/api/data', (req, res) => {
    try {
        res.json(DataStore.getData());
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: '데이터 조회 중 오류가 발생했습니다.' });
    }
});

// 최신 데이터 조회
app.get('/api/current-status', (req, res) => {
    try {
        const data = DataStore.getData();
        const latestData = data[data.length - 1] || {
            water_level: 0,
            machine_status: false,
            timestamp: new Date()
        };
        res.json(latestData);
    } catch (error) {
        console.error('Error fetching current status:', error);
        res.status(500).json({ error: '현재 상태 조회 중 오류가 발생했습니다.' });
    }
});

// 특정 기간 데이터 조회
app.get('/api/data-history', (req, res) => {
    try {
        let hours = parseInt(req.query.hours) || 1;

        if (hours < 1) hours = 1;
        if (hours > 24) hours = 24;

        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
        const filteredData = DataStore.getDataInRange(cutoff.getTime(), Date.now());

        res.json(filteredData);
    } catch (error) {
        console.error('Error fetching data history:', error);
        res.status(500).json({ error: '데이터 히스토리 조회 중 오류가 발생했습니다.' });
    }
});

// 현재 연결 상태 확인
app.get('/api/status', (req, res) => {
    try {
        res.json({
            connectedClients: Array.from(connectedClients),
            dataPoints: DataStore.getData().length,
            dataSource: 'modbus',
            nodeModbus: getModbusStatus(),
            relayReduction: {
                reducing: RelayState.reducing,
                relay1On: RelayState.relay1On,
                relay2On: RelayState.relay2On,
                lastReceivedAt: RelayState.lastReceivedAt,
                udpPort: RELAY_EVENT_UDP_PORT,
            }
        });
    } catch (error) {
        console.error('Error fetching status:', error);
        res.status(500).json({ error: '상태 조회 중 오류가 발생했습니다.' });
    }
});

const staticRoot = resolveStaticRoot();
if (staticRoot) {
    console.log(`[static] 웹 UI: ${staticRoot}`);
    app.use(express.static(staticRoot));
    // CRA SPA: 정적 파일 없으면 index.html (path-to-regexp '*' 호환 이슈로 app.use 사용)
    app.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        if (req.path.startsWith('/api')) return next();
        if (req.path.startsWith('/socket.io')) return next();
        res.sendFile(path.join(staticRoot, 'index.html'), (err) => {
            if (err) next(err);
        });
    });
} else {
    console.warn('[static] build/index.html 없음 — client 폴더에서 npm run build 후 다시 실행');
}

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: '서버 오류가 발생했습니다.',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: '요청하신 리소스를 찾을 수 없습니다.' });
    }
    res.status(404).type('text').send('Not found');
});

// 전역 예외 핸들러 — 처리 안 된 예외가 프로세스를 죽이지 않도록
process.on('uncaughtException', (err) => {
    console.error('[fatal] uncaughtException:', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
    console.error('[fatal] unhandledRejection:', reason);
});

// 서버 시작
const PORT = process.env.PORT || 8000;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startPlcModbusPoller({
        ingest: ingestSerialPayload,
    });
    startRelayUdpListener();
});