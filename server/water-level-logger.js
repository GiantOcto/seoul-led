const fs = require('fs');
const path = require('path');

// 기록 주기 — 1분에 한 번만 CSV에 기록 (소켓 전송은 그대로 실시간)
const LOG_INTERVAL_MS = 60 * 1000;

// 저장 위치: 기본 <프로젝트 루트>/logs/water-level, 필요 시 env로 변경
const LOG_DIR = process.env.WATER_LEVEL_LOG_DIR
    ? path.resolve(process.env.WATER_LEVEL_LOG_DIR)
    : path.join(__dirname, '..', 'logs', 'water-level');

// 화면 표시와 동일한 설치 기준 오프셋(mm)을 더해 기록
// (client/src/components/WaterLevel/WaterLevel.js 의 roundedLevel + 250 과 일치)
const OFFSET_MM = parseInt(process.env.WATER_LEVEL_OFFSET_MM ?? '250', 10);

const CSV_HEADER = '날짜,시간,수위(mm)\n';

let lastLoggedAt = 0;

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
 * 수위 데이터를 1분에 한 번만 CSV에 기록.
 * serial_data 수신마다 호출해도 내부에서 스로틀링.
 */
function logWaterLevel(data) {
    if (!data || typeof data.water_level !== 'number') return;

    const now = new Date();
    if (now.getTime() - lastLoggedAt < LOG_INTERVAL_MS) return;
    lastLoggedAt = now.getTime();

    try {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }
        const file = path.join(LOG_DIR, `water_level_${dateStr(now)}.csv`);
        const isNewFile = !fs.existsSync(file);
        const displayMm = data.water_level + OFFSET_MM; // 화면 표시값과 동일
        const row = `${dateStr(now)},${timeStr(now)},${displayMm}\n`;
        fs.appendFileSync(file, (isNewFile ? CSV_HEADER : '') + row, 'utf8');
    } catch (err) {
        console.error('[water-level-csv] 기록 실패:', err.message);
    }
}

module.exports = { logWaterLevel, WATER_LEVEL_LOG_DIR: LOG_DIR };
