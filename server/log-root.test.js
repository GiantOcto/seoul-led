const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { LOG_ROOT } = require('./log-root');

test('로그 기본 위치는 프로그램 폴더 안 logs 이다', () => {
    assert.strictEqual(LOG_ROOT, path.resolve(__dirname, '..', 'logs'));
});
