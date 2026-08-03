const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// PCB 저감기 상태 리더 — 구버전 PCB 프레임("0123,1")에서 뒤의 1/0(저감기 가동)만 사용.
// 수위(앞 4자리)는 무시 (수위는 PLC Modbus로 받음).
// PCB_SERIAL_PORT 미설정이면 비활성.

const RETRY_MS = 5000;

let port = null;
let retryTimer = null;

function getConfig() {
    return {
        path: String(process.env.PCB_SERIAL_PORT || '').trim(),
        baudRate: parseInt(process.env.PCB_BAUD_RATE || '9600', 10),
    };
}

/** "0123,1" → 1 | 0 | null(형식 불일치) */
function parsePcbStatus(line) {
    const parts = String(line).trim().split(',');
    if (parts.length < 2) return null;
    const ms = parts[1].trim();
    if (ms === '1') return 1;
    if (ms === '0') return 0;
    return null;
}

function scheduleRetry(startFn) {
    if (retryTimer) return;
    console.log(`[pcb] ${RETRY_MS / 1000}초 후 재연결 시도...`);
    retryTimer = setTimeout(() => {
        retryTimer = null;
        startFn();
    }, RETRY_MS);
}

/**
 * @param {{ onStatus: (status: 0|1) => void }} opts 저감기 상태 수신 콜백
 */
function startPcbStatusReader(opts) {
    const cfg = getConfig();
    if (!cfg.path) {
        console.log('[pcb] PCB_SERIAL_PORT 미설정 — PCB 저감 신호 비활성');
        return;
    }

    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
    }

    try {
        port = new SerialPort({
            path: cfg.path,
            baudRate: cfg.baudRate,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
            autoOpen: true,
        });
    } catch (err) {
        console.error('[pcb] SerialPort 생성 실패:', err.message);
        scheduleRetry(() => startPcbStatusReader(opts));
        return;
    }

    port.on('error', (err) => {
        console.error('[pcb] 포트 오류:', err.message);
        scheduleRetry(() => startPcbStatusReader(opts));
    });

    port.on('close', () => {
        console.warn('[pcb] 연결 끊김 — 재연결 예약');
        scheduleRetry(() => startPcbStatusReader(opts));
    });

    port.on('open', () => {
        console.log(`[pcb] ${cfg.path} @ ${cfg.baudRate} — 저감기 상태(1/0) 수신 대기`);
        const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
        parser.on('data', (line) => {
            const status = parsePcbStatus(line);
            if (status === null) return; // 형식 안 맞는 줄은 무시
            opts.onStatus(status);
        });
    });
}

module.exports = { startPcbStatusReader, parsePcbStatus };
