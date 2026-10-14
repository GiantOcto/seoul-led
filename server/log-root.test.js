const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { LOG_ROOT } = require('./log-root');

test('로그 기본 위치는 같은 드라이브 루트의 GaramLED-logs 이다', () => {
    assert.strictEqual(LOG_ROOT, path.join(path.parse(__dirname).root, 'GaramLED-logs'));
});

test('로그 기본 위치는 프로그램 폴더 밖이다 (폴더를 지우고 새로 깔아도 남게)', () => {
    const programDir = path.resolve(__dirname, '..');
    const rel = path.relative(programDir, LOG_ROOT);
    assert.ok(rel.startsWith('..') || path.isAbsolute(rel), `프로그램 폴더 안에 있음: ${LOG_ROOT}`);
});
