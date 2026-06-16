const path = require('path');
const fs = require('fs');
const dgram = require('dgram');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const { logWaterLevel } = require('./water-level-logger');

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
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        transports: ['websocket', 'polling'],
    },
    allowEIO3: true,
});

const cors = require('cors');

app.use(cors());
app.use(express.json());

let connectedClients = new Set();

const RELAY_EVENT_UDP_PORT = parseInt(process.env.RELAY_EVENT_UDP_PORT || '19031', 10);

const RelayState = {
    relay1On: false,
    relay2On: false,
    reducing: false,
    lastReceivedAt: null,
};

const DataStore = {
    data: [],
    lastCleanupTimestamp: null,

    addData(newData) {
        this.data.push(newData);
        this.data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        if (this.data.length > 1000) {
            this.cleanup();
        }
    },

    cleanup() {
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        const startIndex = this.binarySearchTimestamp(oneDayAgo);

        if (startIndex > 0) {
            this.data = this.data.slice(startIndex);
        }

        this.lastCleanupTimestamp = now;
    },

    binarySearchTimestamp(timestamp) {
        let left = 0;
        let right = this.data.length - 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const midTimestamp = new Date(this.data[mid].timestamp).getTime();

            if (midTimestamp === timestamp) {
                return mid;
            }
            if (midTimestamp < timestamp) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
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
    },
};

function isValidSerialData(data) {
    try {
        if (!data || typeof data !== 'object') return false;

        if (!data.timestamp || isNaN(new Date(data.timestamp).getTime())) {
            return false;
        }

        if (
            !Number.isInteger(data.water_level) ||
            data.water_level < 0 ||
            data.water_level > 9999
        ) {
            return false;
        }

        if (typeof data.machine_status !== 'boolean') {
            return false;
        }

        return true;
    } catch (error) {
        console.error('Data validation error', error);
        return false;
    }
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

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    connectedClients.add(socket.id);

    socket.emit('initial_data', DataStore.getData());
    socket.emit('relay_reduction_status', {
        reducing: RelayState.reducing,
        relay1On: RelayState.relay1On,
        relay2On: RelayState.relay2On,
        lastReceivedAt: RelayState.lastReceivedAt,
        source: 'initial',
    });

    // app.exe(Python) → serial_data → 브로드캐스트 (Node 시리얼 직접 읽기 없음)
    socket.on('serial_data', (data) => {
        if (!isValidSerialData(data)) {
            console.error('Invalid serial data received:', data);
            return;
        }

        console.log('Received serial data:', data);
        DataStore.addData(data);
        logWaterLevel(data); // CSV 기록 (내부에서 1분 스로틀)
        io.emit('new_data', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        connectedClients.delete(socket.id);
    });
});

app.get('/api/data', (req, res) => {
    try {
        res.json(DataStore.getData());
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: '데이터 조회 중 오류가 발생했습니다.' });
    }
});

app.get('/api/current-status', (req, res) => {
    try {
        const data = DataStore.getData();
        const latestData = data[data.length - 1] || {
            water_level: 0,
            machine_status: false,
            timestamp: new Date(),
        };
        res.json(latestData);
    } catch (error) {
        console.error('Error fetching current status:', error);
        res.status(500).json({ error: '현재 상태 조회 중 오류가 발생했습니다.' });
    }
});

app.get('/api/data-history', (req, res) => {
    try {
        let hours = parseInt(req.query.hours, 10) || 1;

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

app.get('/api/status', (req, res) => {
    try {
        res.json({
            connectedClients: Array.from(connectedClients),
            dataPoints: DataStore.getData().length,
            waterSource: 'python-app.exe',
            relayReduction: {
                reducing: RelayState.reducing,
                relay1On: RelayState.relay1On,
                relay2On: RelayState.relay2On,
                lastReceivedAt: RelayState.lastReceivedAt,
                udpPort: RELAY_EVENT_UDP_PORT,
            },
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
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: '요청하신 리소스를 찾을 수 없습니다.' });
    }
    res.status(404).type('text').send('Not found');
});

process.on('uncaughtException', (err) => {
    console.error('[fatal] uncaughtException:', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
    console.error('[fatal] unhandledRejection:', reason);
});

const PORT = process.env.PORT || 8000;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('[water] 수위: app.exe(Python) → serial_data (Node COM 직접 읽기 없음)');
    startRelayUdpListener();
});
