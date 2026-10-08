const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { formatLine } = require('./server-logger');

function readTodayLog(dir) {
    const files = fs.readdirSync(dir).filter((f) => /^server_\d{4}-\d{2}-\d{2}\.log$/.test(f));
    assert.strictEqual(files.length, 1);
    return fs.readFileSync(path.join(dir, files[0]), 'utf8');
}

test('formatLine은 로컬 시각과 레벨을 앞에 붙인다', () => {
    const now = new Date(2026, 9, 8, 9, 5, 3);
    assert.strictEqual(
        formatLine('error', ['[modbus] 포트 오류:', 'Access denied'], now),
        '2026-10-08 09:05:03 [error] [modbus] 포트 오류: Access denied\n'
    );
});

test('설치 후 콘솔 출력과 종료 코드가 일자별 파일에 남는다', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'server-log-'));
    const script = [
        "require('./server-logger').installServerLogger();",
        "console.error('테스트 오류', 42);",
        'process.exit(3);',
    ].join('\n');

    const result = spawnSync(process.execPath, ['-e', script], {
        cwd: __dirname,
        env: { ...process.env, SERVER_LOG_DIR: dir },
        encoding: 'utf8',
    });

    assert.strictEqual(result.status, 3);
    const log = readTodayLog(dir);
    assert.match(log, /\[log\] \[server\] 시작 pid=\d+/);
    assert.match(log, /\[error\] 테스트 오류 42/);
    assert.match(log, /\[exit\] 프로세스 종료 \(code=3\)/);
    fs.rmSync(dir, { recursive: true, force: true });
});

test('시작 중 처리 안 된 예외로 죽으면 원인이 파일에 남는다', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'server-log-'));
    const script = [
        "require('./server-logger').installServerLogger();",
        "require('./no-such-module');",
    ].join('\n');

    const result = spawnSync(process.execPath, ['-e', script], {
        cwd: __dirname,
        env: { ...process.env, SERVER_LOG_DIR: dir },
        encoding: 'utf8',
    });

    assert.strictEqual(result.status, 1);
    const log = readTodayLog(dir);
    assert.match(log, /\[fatal\] uncaughtException:[\s\S]*Cannot find module '\.\/no-such-module'/);
    assert.match(log, /\[exit\] 프로세스 종료 \(code=1\)/);
    fs.rmSync(dir, { recursive: true, force: true });
});
