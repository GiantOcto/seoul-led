const fs = require('fs');
const path = require('path');
const util = require('util');

// 서버 콘솔 출력을 일자별 파일로도 기록 — 현장에서 프로그램이 꺼졌을 때 원인 추적용
// 종료 사유(콘솔 창 닫힘 / Ctrl+C / 종료 코드)도 함께 남김

// 저장 위치: 기본 <프로젝트 루트>/logs/server, 필요 시 env로 변경
const LOG_DIR = process.env.SERVER_LOG_DIR
    ? path.resolve(process.env.SERVER_LOG_DIR)
    : path.join(__dirname, '..', 'logs', 'server');

const LEVELS = ['log', 'info', 'warn', 'error'];

// Windows 콘솔 이벤트 → Node 시그널
const SIGNAL_REASONS = {
    SIGHUP: '콘솔 창 닫힘',
    SIGINT: 'Ctrl+C',
    SIGBREAK: 'Ctrl+Break',
};

const originalError = console.error.bind(console);

function pad2(n) {
    return String(n).padStart(2, '0');
}

/** KST 기준 (toISOString 금지 — 로컬 시간 그대로 사용) */
function dateStr(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function timeStr(d) {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function formatLine(level, args, now = new Date()) {
    return `${dateStr(now)} ${timeStr(now)} [${level}] ${util.format(...args)}\n`;
}

function appendServerLog(level, args, now = new Date()) {
    try {
        fs.mkdirSync(LOG_DIR, { recursive: true });
        const file = path.join(LOG_DIR, `server_${dateStr(now)}.log`);
        fs.appendFileSync(file, formatLine(level, args, now), 'utf8');
    } catch (err) {
        originalError('[server-log] 기록 실패:', err.message);
    }
}

/** console.* 출력을 파일에도 남기고, 프로세스 종료 사유를 기록 */
function installServerLogger() {
    for (const level of LEVELS) {
        const original = console[level].bind(console);
        console[level] = (...args) => {
            original(...args);
            appendServerLog(level, args);
        };
    }

    process.on('exit', (code) => {
        appendServerLog('exit', [`프로세스 종료 (code=${code})`]);
    });

    // 처리 안 된 예외로 죽는 경우 기록 (server.js 의 uncaughtException 핸들러가 붙기 전 — 시작 중 크래시 등)
    process.on('uncaughtExceptionMonitor', (err, origin) => {
        if (process.listenerCount('uncaughtException') === 0) {
            appendServerLog('fatal', [`${origin}:`, err]);
        }
    });

    // 리스너를 달면 기본 종료 동작이 사라지므로 기록 후 직접 종료
    for (const [signal, reason] of Object.entries(SIGNAL_REASONS)) {
        process.on(signal, () => {
            console.warn(`[server] ${signal} 수신 (${reason}) — 종료`);
            process.exit(0);
        });
    }

    console.log(`[server] 시작 pid=${process.pid}, 로그: ${LOG_DIR}`);
}

module.exports = { installServerLogger, formatLine, appendServerLog, SERVER_LOG_DIR: LOG_DIR };
