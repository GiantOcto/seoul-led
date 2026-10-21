const test = require('node:test');
const assert = require('node:assert');
const { isLocalRequest, buildStopCommand, requestProgramShutdown } = require('./program-shutdown');

const req = (remoteAddress) => ({ socket: { remoteAddress } });

test('같은 PC에서 온 요청만 허용한다', () => {
    assert.strictEqual(isLocalRequest(req('127.0.0.1')), true);
    assert.strictEqual(isLocalRequest(req('::1')), true);
    assert.strictEqual(isLocalRequest(req('::ffff:127.0.0.1')), true);
    assert.strictEqual(isLocalRequest(req('192.168.0.20')), false);
});

test('종료 명령은 프로그램 폴더 안의 cmd·크롬·node 만 대상으로 한다', () => {
    const cmd = buildStopCommand('C:\\GaramLED');
    assert.match(cmd, /@\('cmd\.exe','chrome\.exe','node\.exe'\)/);
    assert.ok(cmd.includes("-like '*C:\\GaramLED\\*'"), '폴더 경로 끝에 \\ 를 붙여 C:\\GaramLED2 같은 폴더는 제외');
    assert.ok(cmd.includes('$_.ExecutablePath'), '명령줄이 "node server.js" 뿐인 서버도 실행 파일 경로로 찾음');
    assert.ok(cmd.indexOf('Sort-Object') < cmd.indexOf('Stop-Process'), '서버 node 를 맨 마지막에 끄도록 정렬');
});

test('설치된 프로그램(Start-GaramLED.bat 있음)이 아니면 종료하지 않는다', () => {
    let spawned = false;
    const result = requestProgramShutdown({ root: 'C:\\dev\\seoul-led', exists: () => false, spawnStop: () => { spawned = true; } });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(spawned, false);
});

test('설치된 프로그램이면 종료 명령을 실행한다', () => {
    let command = null;
    const result = requestProgramShutdown({ root: 'C:\\GaramLED', exists: () => true, spawnStop: (c) => { command = c; } });
    assert.strictEqual(result.ok, true);
    assert.ok(command.includes('*C:\\GaramLED\\*'));
});
