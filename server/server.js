const path = require('path');
const fs = require('fs');
// server.js 와 같은 폴더의 .env (배치가 프로젝트 루트여도 server\.env 적용)
require('dotenv').config({ path: path.join(__dirname, '.env') });
// 콘솔 출력·종료 사유를 logs/server 에 일자별 기록 (다른 모듈보다 먼저 설치)
require('./server-logger').installServerLogger();

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
const { fetchKmaWeather } = require('./weather');
const { fetchPm10 } = require('./airQuality');

const { isLocalRequest, requestProgramShutdown } = require('./program-shutdown');
const { bringNovaLctToFront } = require('./novalct');
const { startChromeGuard } = require('./chrome-guard');
const { setResolution } = require('./display-resolution');
const { openWindowsSettings, requestWindowsRestart } = require('./windows-control');

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

const RELAY_EVENT_UDP_PORT = parseInt(process.env.RELAY_EVENT_UDP_PORT || '19031', 10);

const RelayState = {
    relay1On: false,
    relay2On: false,
    reducing: false,
    lastReceivedAt: null,
};

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

// ── 날씨 (기상청 단기예보) 30분 + 미세먼지 (에어코리아) 1시간 — 서버가 받아 소켓으로 화면에 전달 ──
const KMA_SERVICE_KEY = (process.env.KMA_SERVICE_KEY || '').trim();
// 비어 있으면 기상청 키로 조회 (둘 다 공공데이터포털 키라 됨 — 키 없이 깔린 기존 현장 .env 대비)
const AIR_KOREA_KEY = (process.env.AIR_KOREA_KEY || '').trim() || KMA_SERVICE_KEY;
const KMA_NX = process.env.KMA_NX || '63';   // 기본: 성남시 수정·중원구 격자
const KMA_NY = process.env.KMA_NY || '124';
const AIR_STATIONS = ['상대원동', '단대동'];   // 미세먼지 측정소 (성남 768 화면과 같음, 앞 측정소 값이 비면 다음)
const WEATHER_REFRESH_MS = 30 * 60 * 1000;
// 측정값이 1시간마다 바뀌고, 에어코리아 하루 한도(개발계정 500건)를 LED 전 지점이 키 하나로 같이 씀
const DUST_REFRESH_MS = 60 * 60 * 1000;
const POLL_RETRY_MS = 5 * 60 * 1000;   // 날씨 실패하면 다음 주기까지 안 기다리고 5분 뒤 다시 (부팅 직후 인터넷 안 붙은 경우 등)
// 미세먼지 실패(인터넷 끊김·한도 초과)는 예전 화면 코드처럼 1분 뒤 다시 — 한도 초과로 거절된 건 한도를 더 안 쓰고, 자정에 풀리면 바로 받음
const DUST_RETRY_MS = 60 * 1000;

/** { temp, sky, pop, dust: { pm10, grade, station }, updatedAt } — 아직 못 받았으면 null */
let weatherState = null;

/** 받은 값을 합쳐 화면에 보냄 (날씨·미세먼지 중 못 받은 쪽은 마지막 값 유지) */
function publishWeather(patch) {
    weatherState = { ...weatherState, ...patch, updatedAt: new Date().toISOString() };
    io.emit('weather_update', weatherState);
}

/** @returns {Promise<boolean>} 성공 여부 */
async function refreshWeather() {
    try {
        publishWeather(await fetchKmaWeather({ serviceKey: KMA_SERVICE_KEY, nx: KMA_NX, ny: KMA_NY }));
        return true;
    } catch (err) {
        console.warn('[weather] 기상청 조회 실패:', err.message);
        return false;
    }
}

let lastDustError = ''; // 1분마다 다시 시도해도 같은 실패는 로그 한 번만

/** @returns {Promise<boolean>} 1시간 뒤에 다시 받을지 (false 면 1분 뒤 다시) */
async function refreshDust() {
    try {
        publishWeather({ dust: await fetchPm10({ serviceKey: AIR_KOREA_KEY, stations: AIR_STATIONS }) });
        lastDustError = '';
        return true;
    } catch (err) {
        if (err.message !== lastDustError) console.warn('[weather] 미세먼지 조회 실패:', err.message);
        lastDustError = err.message;
        // 측정소 값이 비어 있으면(점검중) 조회는 된 거라 자주 부르면 한도만 씀 → 1시간 뒤
        return err.code === 'NO_PM10';
    }
}

/** task 를 바로 한 번 돌리고, true 면 okMs 뒤 · false 면 retryMs 뒤 다시 */
function pollEvery(task, okMs, retryMs = POLL_RETRY_MS) {
    const run = async () => {
        const ok = await task();
        setTimeout(run, ok ? okMs : retryMs);
    };
    run();
}

function startWeatherPolling() {
    if (!KMA_SERVICE_KEY) {
        console.log('[weather] KMA_SERVICE_KEY 미설정 — 날씨·미세먼지 표시 안 함');
        return;
    }
    pollEvery(refreshWeather, WEATHER_REFRESH_MS);
    pollEvery(refreshDust, DUST_REFRESH_MS, DUST_RETRY_MS);
}

// Socket.IO 연결 처리
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    connectedClients.add(socket.id);

    // 클라이언트에 현재 저감 상태 전송
    try {
        socket.emit('relay_reduction_status', {
            reducing: RelayState.reducing,
            relay1On: RelayState.relay1On,
            relay2On: RelayState.relay2On,
            lastReceivedAt: RelayState.lastReceivedAt,
            source: 'initial',
        });
        if (weatherState) socket.emit('weather_update', weatherState);
    } catch (err) {
        console.error('[socket] 초기 상태 전송 오류:', err.message);
    }

    // 연결 해제 처리
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        connectedClients.delete(socket.id);
    });
});

// 현재 연결 상태 확인
app.get('/api/status', (req, res) => {
    try {
        res.json({
            connectedClients: Array.from(connectedClients),
            relayReduction: {
                reducing: RelayState.reducing,
                relay1On: RelayState.relay1On,
                relay2On: RelayState.relay2On,
                lastReceivedAt: RelayState.lastReceivedAt,
                udpPort: RELAY_EVENT_UDP_PORT,
            },
            weather: weatherState,
        });
    } catch (error) {
        console.error('Error fetching status:', error);
        res.status(500).json({ error: '상태 조회 중 오류가 발생했습니다.' });
    }
});

// 헤더 "NovaLCT" — NovaLCT 창을 맨 앞으로, 꺼져 있으면 실행 (같은 PC에서만)
app.post('/api/novalct', async (req, res) => {
    if (!isLocalRequest(req)) {
        return res.status(403).json({ error: '이 PC에서만 NovaLCT 를 띄울 수 있습니다.' });
    }
    const result = await bringNovaLctToFront();
    if (!result.ok) {
        console.warn('[novalct]', result.error);
        return res.status(409).json({ error: result.error });
    }
    res.json({ success: true });
});

// 헤더 "해상도 1920×1080" — 주 모니터 해상도를 1920x1080 으로 강제 설정 (같은 PC에서만)
app.post('/api/resolution', async (req, res) => {
    if (!isLocalRequest(req)) {
        return res.status(403).json({ error: '이 PC에서만 해상도를 바꿀 수 있습니다.' });
    }
    const result = await setResolution();
    if (!result.ok) {
        console.warn('[resolution]', result.error);
        return res.status(409).json({ error: result.error });
    }
    console.log('[resolution] 해상도 1920x1080 설정');
    res.json({ success: true });
});

// 헤더 "윈도우 설정" — 윈도우 설정 창을 LED 를 안 가리는 가운데 자리에 작게 띄움 (같은 PC에서만)
app.post('/api/windows-settings', async (req, res) => {
    if (!isLocalRequest(req)) {
        return res.status(403).json({ error: '이 PC에서만 윈도우 설정을 열 수 있습니다.' });
    }
    const result = await openWindowsSettings();
    if (!result.ok) {
        console.warn('[windows]', result.error);
        return res.status(409).json({ error: result.error });
    }
    res.json({ success: true });
});

// 헤더 "윈도우 다시 시작" — 화면에서 확인을 받은 뒤 윈도우를 다시 시작 (같은 PC에서만)
app.post('/api/windows-restart', (req, res) => {
    if (!isLocalRequest(req)) {
        return res.status(403).json({ error: '이 PC에서만 윈도우를 다시 시작할 수 있습니다.' });
    }
    const result = requestWindowsRestart();
    if (!result.ok) {
        console.warn('[windows]', result.error);
        return res.status(409).json({ error: result.error });
    }
    console.warn('[windows] 화면에서 윈도우 다시 시작 요청');
    res.json({ success: true });
});

// 헤더 "프로그램 종료" — 서버·크롬·감시 창까지 모두 끔 (같은 PC에서만)
app.post('/api/shutdown', (req, res) => {
    if (!isLocalRequest(req)) {
        return res.status(403).json({ error: '이 PC에서만 종료할 수 있습니다.' });
    }
    const result = requestProgramShutdown();
    if (!result.ok) {
        return res.status(409).json({ error: result.error });
    }
    console.warn('[server] 화면에서 프로그램 종료 요청 — 서버·크롬·감시 창 종료');
    res.json({ success: true });
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
    startRelayUdpListener();
    startWeatherPolling();
    startChromeGuard();
});