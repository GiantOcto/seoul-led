const fs = require('fs');
const path = require('path');

// D1004 ON 로그 — OFF(0)→ON(1) 전환 순간 즉시 기록(초까지) + ON 유지 중에는 매분 정각(:00) 격자로 기록.
// OFF는 기록 안 함. (로그만 봐도 켜진 시각과 지속 시간이 보이도록)

// 저장 위치: 기본 <프로젝트 루트>/logs/d1004-on, 필요 시 env로 변경
const LOG_DIR = process.env.D1004_LOG_DIR
    ? path.resolve(process.env.D1004_LOG_DIR)
    : path.join(__dirname, '..', 'logs', 'd1004-on');

const CSV_HEADER = '날짜,시간,상태\n';

let lastState = null; // null=아직 모름, 0=OFF, 1=ON
let lastLoggedMinute = ''; // 'YYYY-MM-DD HH:MM' — 이미 기록한 분 (유지 기록 격자용)

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

/**
 * 폴러가 매 폴링마다 호출 — OFF→ON 전환 시 즉시 기록(초까지),
 * ON 유지 중엔 매분 정각(:00) 격자로 기록 (수위 로그와 동일한 리듬).
 * @param {number|undefined} state D1004 값 (1=ON, 0=OFF)
 */
function logD1004(state) {
    if (state !== 0 && state !== 1) return; // 값 없음/비정상은 무시

    const turnedOn = state === 1 && lastState !== 1;
    lastState = state;
    if (state !== 1) return; // OFF는 기록 안 함

    const now = new Date();
    const minuteKey = `${dateStr(now)} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

    let timeText;
    if (turnedOn) {
        timeText = timeStr(now); // 켜진 순간은 초까지 정확히
    } else {
        if (minuteKey === lastLoggedMinute) return; // 이 분은 이미 기록함
        timeText = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:00`; // 유지 기록은 정각 표기
    }
    lastLoggedMinute = minuteKey; // 켜진 분은 유지 기록 중복 방지를 위해 함께 마킹

    try {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }
        const file = path.join(LOG_DIR, `d1004_on_${dateStr(now)}.csv`);
        const isNewFile = !fs.existsSync(file);
        const row = `${dateStr(now)},${timeText},ON\n`;
        fs.appendFileSync(file, (isNewFile ? CSV_HEADER : '') + row, 'utf8');
    } catch (err) {
        console.error('[d1004-csv] 기록 실패:', err.message);
    }
}

module.exports = { logD1004, D1004_LOG_DIR: LOG_DIR };
