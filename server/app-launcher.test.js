const test = require('node:test');
const assert = require('node:assert/strict');
const { launchApp, resultFromExit, restartArgs, APPS } = require('./app-launcher');

test('끝 코드를 프로그램 이름이 들어간 로그 메시지로', () => {
    assert.deepEqual(resultFromExit(APPS.viplex, null), { ok: true });
    assert.match(resultFromExit(APPS.viplex, { code: 2 }).error, /ViPlex 가 설치되어 있지 않습니다/);
    assert.match(resultFromExit(APPS.viplex, { code: 3 }).error, /ViPlex 창이 5분 안에 뜨지 않았습니다/);
    assert.match(resultFromExit(APPS.relay, { code: 2 }).error, /릴레이 시스템 가 설치되어 있지 않습니다/);
    assert.match(resultFromExit(APPS.relay, { code: 3 }).error, /릴레이 시스템 창이 2분 안에 뜨지 않았습니다/);
    assert.match(resultFromExit(APPS.relay, { code: 4 }).error, /릴레이 시스템 가 꺼지지 않아 다시 켜지 못했습니다/);
    assert.match(resultFromExit(APPS.relay, { code: null, message: 'timeout' }).error, /켜지 못했습니다\. \(timeout\)/);
});

test('ViPlex 는 관리자 권한 작업으로 창을 앞으로, 릴레이는 끄고 다시 켜서 본 창이 뜰 때까지', () => {
    assert.equal(APPS.viplex.mode, 'front');
    assert.equal(APPS.viplex.taskName, 'GaramLED ViPlex'); // register-tasks.ps1 이 등록하는 이름과 같아야 함
    assert.deepEqual(APPS.viplex.args, ['front-viplex']); // 그 작업이 돌리는 것과 같은 명령 (작업이 없을 때 직접 실행)

    const relay = restartArgs(APPS.relay);
    assert.equal(relay[0], 'restart');
    assert.equal(relay[relay.indexOf('--process') + 1], 'RelaySystem_GUI');
    assert.equal(relay[relay.indexOf('--wait') + 1], '120');
    assert.equal(relay[relay.indexOf('--splash-title') + 1], 'SplashScreen'); // 시작 화면은 "다 켜짐"으로 치지 않음
    assert.ok(relay[relay.indexOf('--exe-list') + 1].startsWith('C:\\Relay System\\RelaySystem_GUI.exe|'));
});

test('진행 중에 또 누르면 한 번만 실행, 프로그램이 다르면 따로 실행', async () => {
    const runs = [];
    const finishers = {};
    const run = (app) => {
        runs.push(app.label);
        return new Promise((resolve) => {
            finishers[app.label] = resolve;
        });
    };
    const first = launchApp('viplex', run);
    const second = launchApp('viplex', run);
    const relay = launchApp('relay', run);
    assert.deepEqual(runs, ['ViPlex', '릴레이 시스템']);

    finishers.ViPlex({ ok: true });
    finishers['릴레이 시스템']({ ok: true });
    assert.deepEqual(await first, { ok: true });
    assert.deepEqual(await second, { ok: true });
    assert.deepEqual(await relay, { ok: true });

    // 끝난 뒤 누르면 다시 실행
    const third = launchApp('viplex', run);
    finishers.ViPlex({ ok: true });
    await third;
    assert.equal(runs.length, 3);
});
