const test = require('node:test');
const assert = require('node:assert/strict');
const { resultFromExit } = require('./display-resolution');

test('스크립트 끝 코드를 로그 메시지로', () => {
    assert.deepEqual(resultFromExit(null), { ok: true });
    assert.match(resultFromExit({ code: 2 }).error, /읽지 못했습니다/);
    assert.match(resultFromExit({ code: 3 }).error, /변경을 거부했습니다/);
    assert.match(resultFromExit({ code: null, message: 'timeout' }).error, /바꾸지 못했습니다\. \(timeout\)/);
});

test('스크립트 출력은 실패 메시지 뒤에 한 줄로 붙임', () => {
    const result = resultFromExit({ code: 3 }, 'current 1024x768 32bit 60Hz\r\ncard modes 0\r\n');
    assert.match(result.error, /변경을 거부했습니다.*\[current 1024x768 32bit 60Hz \/ card modes 0\]$/);
});
