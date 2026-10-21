const dgram = require('dgram');

// PCB 저감기(송풍기) 상태를 같은 PC의 릴레이 시스템에 UDP 로 넘겨줌
// 서초 pcb 현장은 릴레이 보드 없이 PCB 가 송풍기를 직접 돌리므로, 릴레이 시스템은 이 신호로 송풍기 카드·MQTT 운전 상태를 표시
// (COM 포트는 한 프로그램만 열 수 있어 LED 서버가 읽은 값을 전달)
//
// 보내는 형식: {"type":"pcb_blower_status","blowerOn":true,"ts":"YYYY-MM-DD HH:mm:ss"} → 127.0.0.1:PCB_FORWARD_UDP_PORT (기본 19032)
// 상태가 바뀌면 즉시 + PCB 신호가 살아 있는 동안 5초마다 현재 상태 재전송 (놓침·재시작 대비)
// PCB 신호가 10초 넘게 안 오면 재전송을 멈춤 → 릴레이 쪽이 끊김으로 판단 가능

const HEARTBEAT_MS = 5000;
const STALE_MS = 10000;
const DEFAULT_PORT = 19032;

function pad2(n) {
    return String(n).padStart(2, '0');
}

/** KST 로컬 시각 (toISOString 금지) */
function formatTs(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function buildMessage(blowerOn, date = new Date()) {
    return Buffer.from(JSON.stringify({ type: 'pcb_blower_status', blowerOn, ts: formatTs(date) }), 'utf8');
}

/**
 * @param {{ now?: () => number, send: (buf: Buffer) => void }} opts
 * @returns {{ update: (status: 0|1) => void, tick: () => void }}
 */
function createPcbStatusForwarder({ now = Date.now, send }) {
    let lastStatus = null;
    let lastAt = 0;

    return {
        /** PCB 줄을 받을 때마다 호출 — 처음이거나 바뀌었을 때만 즉시 전송 */
        update(status) {
            const changed = status !== lastStatus;
            lastStatus = status;
            lastAt = now();
            if (changed) send(buildMessage(status === 1));
        },
        /** 주기 전송 — PCB 신호가 살아 있을 때만 */
        tick() {
            if (lastStatus === null || now() - lastAt > STALE_MS) return;
            send(buildMessage(lastStatus === 1));
        },
    };
}

/** 서버용: UDP 소켓 + 5초 주기 전송까지 붙여서 시작. PCB_FORWARD_UDP_PORT=0 이면 전달 안 함 */
function startPcbStatusForwarder() {
    const port = parseInt(process.env.PCB_FORWARD_UDP_PORT ?? String(DEFAULT_PORT), 10);
    if (!Number.isInteger(port) || port <= 0) {
        console.log('[pcb-forward] PCB_FORWARD_UDP_PORT=0 — 릴레이 시스템으로 전달 안 함');
        return { update() {} };
    }

    const socket = dgram.createSocket('udp4');
    socket.on('error', (err) => console.error('[pcb-forward] 소켓 오류:', err.message));
    const forwarder = createPcbStatusForwarder({
        send: (buf) => socket.send(buf, port, '127.0.0.1', (err) => {
            if (err) console.error('[pcb-forward] 전송 실패:', err.message);
        }),
    });
    setInterval(() => forwarder.tick(), HEARTBEAT_MS).unref();
    console.log(`[pcb-forward] PCB 송풍기 상태 → 릴레이 시스템 127.0.0.1:${port}`);
    return forwarder;
}

module.exports = { createPcbStatusForwarder, startPcbStatusForwarder, buildMessage };
