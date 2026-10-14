const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

test('수위 CSV에는 PLC 원값을 그대로 기록한다 (LED 화면의 +250 은 더하지 않음)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wl-log-'));
    process.env.WATER_LEVEL_LOG_DIR = dir;
    const { logWaterLevel } = require('./water-level-logger');

    logWaterLevel({ water_level: 37 });

    const [file] = fs.readdirSync(dir);
    const rows = fs.readFileSync(path.join(dir, file), 'utf8').trim().split('\n');
    assert.strictEqual(rows[0], '날짜,시간,수위(mm)');
    assert.match(rows[1], /^\d{4}-\d{2}-\d{2},\d{2}:\d{2}:00,37$/);

    delete process.env.WATER_LEVEL_LOG_DIR;
    fs.rmSync(dir, { recursive: true, force: true });
});
