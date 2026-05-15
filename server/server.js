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
const { SerialPort } = require('serialport');
const dgram = require('dgram');

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

/** Node 직접 시리얼 사용 시 true (SERIAL_PORT 설정됨) */
let nodeSerialActive = false;
/** 수위 PCB: 'R' 송신 → 27바이트 응답 (r, + 20센서 + , + 4자리 mm) */
const WL27_LEN = 27;
const WATER_LEVEL_POLL_MS = parseInt(process.env.WATER_LEVEL_POLL_MS || '500', 10);
let serialRetryTimer = null;
let wlPollTimer = null;
let wlRxBuffer = Buffer.alloc(0);
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

/**
 * 수위 센서 PCB 응답 27바이트 (ASCII)
 * [0]='r' [1]=',' [2..21] 센서1~20 ('0'/'1') [22]=',' [23..26] 수위 mm 4자리
 */
function parseWl27Frame(buf) {
    if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
    if (buf.length !== WL27_LEN) return null;
    if (buf[0] !== 0x72 || buf[1] !== 0x2c) return null; // r,
    if (buf[22] !== 0x2c) return null;
    const sensor_bits = [];
    for (let i = 2; i < 22; i++) {
        const b = buf[i];
        if (b !== 0x30 && b !== 0x31) return null;
        sensor_bits.push(b === 0x31);
    }
    let digits = '';
    for (let i = 23; i < 27; i++) {
        const b = buf[i];
        if (b < 0x30 || b > 0x39) return null;
        digits += String.fromCharCode(b);
    }
    const water_level = parseInt(digits, 10);
    if (Number.isNaN(water_level) || water_level < 0 || water_level > 9999) return null;
    const machine_status = sensor_bits.some(Boolean);
    return { water_level, machine_status, sensor_bits };
}

function processWl27Chunk(chunk) {
    wlRxBuffer = Buffer.concat([wlRxBuffer, chunk]);
    if (wlRxBuffer.length > 4096) wlRxBuffer = wlRxBuffer.slice(-1024);

    while (wlRxBuffer.length >= WL27_LEN) {
        let idx = -1;
        for (let i = 0; i <= wlRxBuffer.length - 2; i++) {
            if (wlRxBuffer[i] === 0x72 && wlRxBuffer[i + 1] === 0x2c) {
                idx = i;
                break;
            }
        }
        if (idx === -1) {
            if (wlRxBuffer.length > 2) wlRxBuffer = wlRxBuffer.slice(-2);
            return;
        }
        if (wlRxBuffer.length < idx + WL27_LEN) {
            if (idx > 0) wlRxBuffer = wlRxBuffer.slice(idx);
            return;
        }
        const frame = wlRxBuffer.slice(idx, idx + WL27_LEN);
        wlRxBuffer = wlRxBuffer.slice(idx + WL27_LEN);
        const parsed = parseWl27Frame(frame);
        if (parsed) {
            ingestSerialPayload({
                timestamp: new Date().toISOString(),
                water_level: parsed.water_level,
                machine_status: parsed.machine_status,
                sensor_bits: parsed.sensor_bits,
                raw_data: frame.toString('ascii'),
            });
        } else if (process.env.NODE_ENV === 'development') {
            console.warn('[serial] WL27 파싱 실패:', frame.toString('hex'));
        }
    }
}

function isValidSerialData(data) {
    try {
        if (!data || typeof data !== 'object') return false;

        if (!data.timestamp || isNaN(new Date(data.timestamp).getTime())) {
            return false;
        }

        if (!Number.isInteger(data.water_level) ||
            data.water_level < 0 ||
            data.water_level > 9999) {
            return false;
        }

        if (typeof data.machine_status !== 'boolean') {
            return false;
        }

        if (data.sensor_bits !== undefined) {
            if (!Array.isArray(data.sensor_bits) || data.sensor_bits.length !== 20) return false;
            for (const b of data.sensor_bits) {
                if (typeof b !== 'boolean') return false;
            }
        }

        return true;
    } catch (error) {
        console.error('Data validation error', error);
        return false;
    }
}

/** 저장 + 브로드캐스트 (Socket.IO / Node 시리얼 공통) */
function ingestSerialPayload(data) {
    if (!isValidSerialData(data)) {
        console.error('Invalid serial data:', data);
        return false;
    }
    if (process.env.NODE_ENV === 'development') console.log('[serial] 수신:', data);
    DataStore.addData(data);
    io.emit('new_data', data);
    return true;
}

const SERIAL_RETRY_MS = 5000;

function startNodeSerialListener() {
    const serialPath = process.env.SERIAL_PORT;
    if (!serialPath || String(serialPath).trim() === '') {
        console.log('[serial] SERIAL_PORT 미설정 — 시리얼 비활성');
        nodeSerialActive = false;
        return;
    }

    const baudRate = parseInt(process.env.BAUD_RATE || '9600', 10);
    wlRxBuffer = Buffer.alloc(0);

    let port;
    try {
        port = new SerialPort({
            path: String(serialPath).trim(),
            baudRate,
            autoOpen: true
        });
    } catch (err) {
        console.error('[serial] SerialPort 생성 실패:', err.message);
        nodeSerialActive = false;
        scheduleSerialRetry();
        return;
    }

    const sendR = () => {
        if (!port || !port.writable) return;
        port.write(Buffer.from('R', 'ascii'), (err) => {
            if (err) console.error('[serial] R 전송 실패:', err.message);
        });
    };

    port.on('data', (chunk) => {
        try {
            processWl27Chunk(chunk);
        } catch (err) {
            console.error('[serial] 데이터 처리 오류:', err.message);
        }
    });

    port.on('error', (err) => {
        console.error('[serial] 포트 오류:', err.message);
        nodeSerialActive = false;
        if (wlPollTimer) {
            clearInterval(wlPollTimer);
            wlPollTimer = null;
        }
        scheduleSerialRetry();
    });

    port.on('open', () => {
        nodeSerialActive = true;
        console.log(
            `[serial] WL27 프로토콜: ${serialPath} @ ${baudRate}, 대문자 R 폴링 ${Math.max(100, WATER_LEVEL_POLL_MS)}ms`
        );
        wlRxBuffer = Buffer.alloc(0);
        sendR();
        if (wlPollTimer) {
            clearInterval(wlPollTimer);
            wlPollTimer = null;
        }
        wlPollTimer = setInterval(sendR, Math.max(100, WATER_LEVEL_POLL_MS));
    });

    port.on('close', () => {
        if (wlPollTimer) {
            clearInterval(wlPollTimer);
            wlPollTimer = null;
        }
        if (nodeSerialActive) {
            console.warn('[serial] 연결 끊김 — 재연결 예약');
            nodeSerialActive = false;
            scheduleSerialRetry();
        }
    });
}

function scheduleSerialRetry() {
    if (serialRetryTimer) return;
    console.log(`[serial] ${SERIAL_RETRY_MS / 1000}초 후 재연결 시도...`);
    serialRetryTimer = setTimeout(() => {
        serialRetryTimer = null;
        startNodeSerialListener();
    }, SERIAL_RETRY_MS);
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
            nodeSerial: {
                active: nodeSerialActive,
                protocol: 'wl27',
                path: process.env.SERIAL_PORT || null,
                baudRate: process.env.BAUD_RATE ? parseInt(process.env.BAUD_RATE, 10) : null,
                pollMs: Math.max(100, WATER_LEVEL_POLL_MS),
            },
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
    startNodeSerialListener();
    startRelayUdpListener();
});