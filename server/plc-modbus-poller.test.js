const test = require('node:test');
const assert = require('node:assert');
const { mapModbusRegisters } = require('./plc-modbus-poller');

// registers = [D1001 수위, D1002 상태(0=PLC OFF,1=정상,2=에러), D1003 센서에러, D1004 압축공기]
function withInvert(value, fn) {
    const prev = process.env.D1004_INVERT;
    process.env.D1004_INVERT = value;
    try {
        return fn();
    } finally {
        if (prev === undefined) delete process.env.D1004_INVERT;
        else process.env.D1004_INVERT = prev;
    }
}

test('PLC 정상이면 D1004 를 그대로 쓴다', () => {
    const data = withInvert('0', () => mapModbusRegisters([120, 1, 0, 1]));
    assert.strictEqual(data.d1004_state, 1);
});

test('PLC 정상 + 반전 옵션이면 D1004 를 뒤집는다', () => {
    const data = withInvert('1', () => mapModbusRegisters([120, 1, 0, 0]));
    assert.strictEqual(data.d1004_state, 1);
});

test('PLC OFF 이면 반전 옵션이 켜져 있어도 D1004 는 신호 없음으로 둔다', () => {
    const data = withInvert('1', () => mapModbusRegisters([0, 0, 0, 0]));
    assert.strictEqual(data.d1004_state, undefined);
    assert.strictEqual(data.plc_off, true);
});

test('PLC 에러 상태에서는 D1004 를 계속 표시한다', () => {
    const data = withInvert('0', () => mapModbusRegisters([120, 2, 0, 1]));
    assert.strictEqual(data.d1004_state, 1);
});
