const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { EventEmitter } = require('events');
const { startChromeGuard } = require('./chrome-guard');

function fakeSpawn(calls) {
    return (cmd, args) => {
        calls.push({ cmd, args });
        const child = new EventEmitter();
        child.stdout = new EventEmitter();
        return child;
    };
}

test('개발 PC(Start-GaramLED.bat 없음)에선 감시를 띄우지 않음', () => {
    const calls = [];
    const child = startChromeGuard({ root: 'C:\\repo', exists: () => false, spawnFn: fakeSpawn(calls) });
    assert.equal(child, null);
    assert.equal(calls.length, 0);
});

test('설치된 프로그램에선 서버 PID 와 LED 프로필 경로를 넘겨 감시를 띄움', () => {
    const calls = [];
    startChromeGuard({ root: 'C:\\GaramLED', exists: () => true, spawnFn: fakeSpawn(calls), serverPid: 1234 });
    assert.equal(calls.length, 1);
    const { cmd, args } = calls[0];
    assert.equal(cmd, 'powershell.exe');
    assert.equal(args[args.indexOf('-ServerPid') + 1], '1234');
    assert.equal(args[args.indexOf('-ProfileDir') + 1], path.join('C:\\GaramLED', 'chrome-profile'));
});

test('감시가 알린 일(다른 크롬 종료 · 작업표시줄 표시)을 서버 로그에 남김', () => {
    // Arrange
    const logged = [];
    const originalLog = console.log;
    console.log = (message) => logged.push(message);
    try {
        const child = startChromeGuard({ root: 'C:\\GaramLED', exists: () => true, spawnFn: fakeSpawn([]) });
        logged.length = 0;   // "감시 시작" 줄은 빼고 봄

        // Act
        child.stdout.emit('data', Buffer.from('killed 111\r\ntaskbar 222\r\n'));
    } finally {
        console.log = originalLog;
    }

    // Assert
    assert.equal(logged.length, 2);
    assert.match(logged[0], /크롬 종료 \(pid 111\)/);
    assert.match(logged[1], /작업표시줄/);
});
