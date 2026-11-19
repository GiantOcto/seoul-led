const test = require('node:test');
const assert = require('node:assert/strict');
const { runAsAdminTask, runLedwin, LEDWIN, NO_TASK_EXIT_CODE } = require('./ledwin');

const JOB = { taskName: 'GaramLED NovaLCT', args: ['front-novalct'], waitSec: 300 };

/** 차례로 정해 둔 결과를 돌려주는 가짜 execFile — 불린 실행 파일과 인자를 기록 */
function fakeExec(results, calls) {
    return (file, args, options, done) => {
        calls.push({ file, args, timeout: options.timeout });
        done(results.shift());
    };
}

test('관리자 권한 작업이 있으면 그 작업으로만 돌림', async () => {
    const calls = [];
    const err = await runAsAdminTask(JOB, fakeExec([null], calls));
    assert.equal(err, null);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].file, LEDWIN);
    assert.deepEqual(calls[0].args.slice(0, 2), ['run-task', 'GaramLED NovaLCT']);
});

test('작업이 없으면(개발 PC·예전 설치본) 같은 명령을 직접 실행', async () => {
    const calls = [];
    const err = await runAsAdminTask(JOB, fakeExec([{ code: NO_TASK_EXIT_CODE, message: 'no task' }, null], calls));
    assert.equal(err, null);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1].args, ['front-novalct']);
});

test('작업으로 돌렸는데 실패하면 그 결과를 그대로 (직접 실행으로 또 켜지 않음)', async () => {
    const calls = [];
    const err = await runAsAdminTask(JOB, fakeExec([{ code: 3, message: 'no window' }], calls));
    assert.equal(err.code, 3);
    assert.equal(calls.length, 1);
});

test('기다리는 시간보다 조금 길게 잡고 끊음', async () => {
    const calls = [];
    await runLedwin(['settings'], 30, fakeExec([null], calls));
    assert.ok(calls[0].timeout > 30 * 1000);
});
