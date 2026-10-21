const test = require('node:test');
const assert = require('node:assert');
const { createPcbStatusForwarder, buildMessage } = require('./pcb-status-forwarder');

function setup() {
    let clock = 0;
    const sent = [];
    const forwarder = createPcbStatusForwarder({
        now: () => clock,
        send: (buf) => sent.push(JSON.parse(buf.toString('utf8'))),
    });
    return { forwarder, sent, advance: (ms) => { clock += ms; } };
}

test('buildMessage는 송풍기 상태와 로컬 시각을 담는다', () => {
    const msg = JSON.parse(buildMessage(true, new Date(2026, 9, 21, 9, 5, 3)).toString('utf8'));
    assert.deepStrictEqual(msg, { type: 'pcb_blower_status', blowerOn: true, ts: '2026-10-21 09:05:03' });
});

test('처음 받은 상태와 바뀐 상태는 바로 보내고, 같은 상태는 다시 안 보낸다', () => {
    const { forwarder, sent } = setup();
    forwarder.update(1);
    forwarder.update(1);
    forwarder.update(0);
    assert.deepStrictEqual(sent.map((m) => m.blowerOn), [true, false]);
});

test('PCB 신호가 살아 있으면 주기 전송 때 현재 상태를 다시 보낸다', () => {
    const { forwarder, sent, advance } = setup();
    forwarder.update(1);
    advance(5000);
    forwarder.tick();
    assert.deepStrictEqual(sent.map((m) => m.blowerOn), [true, true]);
});

test('PCB 신호가 10초 넘게 끊기면 주기 전송을 멈춘다', () => {
    const { forwarder, sent, advance } = setup();
    forwarder.update(0);
    advance(10001);
    forwarder.tick();
    assert.strictEqual(sent.length, 1);
});

test('PCB 신호를 한 번도 못 받았으면 아무것도 안 보낸다', () => {
    const { forwarder, sent } = setup();
    forwarder.tick();
    assert.strictEqual(sent.length, 0);
});
