const fs = require('fs');
const path = require('path');

// 기록 주기 — 매분 정각(:00) 격자로 1분에 한 번만 CSV에 기록 (폴링/소켓 전송은 그대로 실시간)
// RelaySystem CSV와 동일한 방식: 분이 바뀌는 첫 폴링에서 기록하고 시각은 HH:MM:00으로 표기

// 저장 위치: 기본 <프로젝트 루트>/logs/water-level, 필요 시 env로 변경
const LOG_DIR = process.env.WATER_LEVEL_LOG_DIR
    ? path.resolve(process.env.WATER_LEVEL_LOG_DIR)
    : path.join(__dirname, '..', 'logs', 'water-level');

// LED 수위 화면과 동일한 설치 기준 오프셋(mm)을 더해 기록
// (client/src/utils/waterLevelDisplay.js 의 WATER_LEVEL_OFFSET_MM=250 과 일치)
const OFFSET_MM = parseInt(process.env.WATER_LEVEL_OFFSET_MM ?? '250', 10);

const CSV_HEADER = '날짜,시간,수위(mm)\n';

let lastLoggedMinute = ''; // 'YYYY-MM-DD HH:MM' — 이미 기록한 분

function pad2(n) {
    return String(n).padStart(2, '0');
}

/** KST 기준 (toISOString 금지 — 로컬 시간 그대로 사용) */
function dateStr(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * 수위 데이터를 매분 정각 격자로 1분에 한 번만 CSV에 기록.
 * 폴러가 매 폴링(기본 500ms)마다 호출해도 분이 바뀌는 첫 호출에서만 기록.
 */
function logWaterLevel(data) {
    if (!data || typeof data.water_level !== 'number') return;

    const now = new Date();
    const minuteKey = `${dateStr(now)} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    if (minuteKey === lastLoggedMinute) return;
    lastLoggedMinute = minuteKey;

    try {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }
        const file = path.join(LOG_DIR, `water_level_${dateStr(now)}.csv`);
        const isNewFile = !fs.existsSync(file);
        const displayMm = data.water_level + OFFSET_MM; // LED 표시값과 동일
        // 시각은 해당 분의 정각(:00)으로 표기 — RelaySystem CSV와 동일한 격자
        const row = `${dateStr(now)},${pad2(now.getHours())}:${pad2(now.getMinutes())}:00,${displayMm}\n`;
        fs.appendFileSync(file, (isNewFile ? CSV_HEADER : '') + row, 'utf8');
    } catch (err) {
        console.error('[water-level-csv] 기록 실패:', err.message);
    }
}

module.exports = { logWaterLevel, WATER_LEVEL_LOG_DIR: LOG_DIR };
