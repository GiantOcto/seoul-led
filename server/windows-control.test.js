const test = require('node:test');
const assert = require('node:assert/strict');
const { settingsResultFromExit, requestWindowsRestart } = require('./windows-control');

test('윈도우 설정 스크립트 끝 코드를 로그 메시지로', () => {
    assert.deepEqual(settingsResultFromExit(null), { ok: true });
    assert.match(settingsResultFromExit({ code: 3 }).error, /30초 안에 뜨지 않았습니다/);
    assert.match(settingsResultFromExit({ code: 1, message: 'boom' }).error, /열지 못했습니다\. \(boom\)/);
});

test('개발 PC(Start-GaramLED.bat 없음)에선 윈도우를 다시 시작하지 않음', () => {
    let restarted = 0;
    const result = requestWindowsRestart({ root: 'C:\\repo', exists: () => false, restart: () => { restarted += 1; } });
    assert.equal(result.ok, false);
    assert.equal(restarted, 0);
});

test('설치된 프로그램에선 윈도우 다시 시작을 한 번 실행', () => {
    let restarted = 0;
    const result = requestWindowsRestart({ root: 'C:\\GaramLED', exists: () => true, restart: () => { restarted += 1; } });
    assert.deepEqual(result, { ok: true });
    assert.equal(restarted, 1);
});
