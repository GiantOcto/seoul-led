const test = require('node:test');
const assert = require('node:assert/strict');
const { bringNovaLctToFront, resultFromExit } = require('./novalct');

test('스크립트 끝 코드를 로그 메시지로', () => {
    assert.deepEqual(resultFromExit(null), { ok: true });
    assert.match(resultFromExit({ code: 2 }).error, /설치되어 있지 않습니다/);
    assert.match(resultFromExit({ code: 3 }).error, /5분 안에 뜨지 않았습니다/);
    assert.match(resultFromExit({ code: null, message: 'timeout' }).error, /띄우지 못했습니다\. \(timeout\)/);
});

test('진행 중에 또 누르면 스크립트를 한 번만 실행', async () => {
    let runs = 0;
    let finish;
    const run = () => {
        runs += 1;
        return new Promise((resolve) => {
            finish = resolve;
        });
    };
    const first = bringNovaLctToFront(run);
    const second = bringNovaLctToFront(run);
    finish({ ok: true });
    assert.deepEqual(await first, { ok: true });
    assert.deepEqual(await second, { ok: true });
    assert.equal(runs, 1);

    // 끝난 뒤 누르면 다시 실행
    const third = bringNovaLctToFront(run);
    finish({ ok: true });
    await third;
    assert.equal(runs, 2);
});
