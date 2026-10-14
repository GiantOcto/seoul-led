const test = require('node:test');
const assert = require('node:assert/strict');
const { nowcastBase, forecastBase, skyKind, parseNowcast, pickForecast } = require('./weather');

const kst = (iso) => new Date(`${iso}+09:00`);

test('초단기실황 기준시각: 45분 전이면 이전 정시', () => {
    assert.deepEqual(nowcastBase(kst('2026-10-01T11:20:00')), { base_date: '20261001', base_time: '1000' });
    assert.deepEqual(nowcastBase(kst('2026-10-01T11:50:00')), { base_date: '20261001', base_time: '1100' });
});

test('초단기실황 기준시각: 자정 직후는 전날 23시', () => {
    assert.deepEqual(nowcastBase(kst('2026-10-01T00:10:00')), { base_date: '20260930', base_time: '2300' });
});

test('단기예보 기준시각: 발표 15분 뒤부터 그 발표를 사용', () => {
    assert.deepEqual(forecastBase(kst('2026-10-01T11:20:00')), { base_date: '20261001', base_time: '1100' });
    assert.deepEqual(forecastBase(kst('2026-10-01T11:10:00')), { base_date: '20261001', base_time: '0800' });
    assert.deepEqual(forecastBase(kst('2026-10-01T02:20:00')), { base_date: '20261001', base_time: '0200' });
});

test('단기예보 기준시각: 02시 발표 전이면 전날 23시', () => {
    assert.deepEqual(forecastBase(kst('2026-10-01T01:00:00')), { base_date: '20260930', base_time: '2300' });
});

test('강수형태가 있으면 비/눈, 없으면 하늘상태로 아이콘 결정', () => {
    assert.equal(skyKind(1, 1), 'rain');
    assert.equal(skyKind(4, 1), 'rain');
    assert.equal(skyKind(3, 4), 'snow');
    assert.equal(skyKind(7, 1), 'snow');
    assert.equal(skyKind(0, 1), 'clear');
    assert.equal(skyKind(0, 3), 'partly');
    assert.equal(skyKind(0, 4), 'cloudy');
});

test('초단기실황에서 기온·강수형태 추출', () => {
    const items = [
        { category: 'PTY', obsrValue: '0' },
        { category: 'REH', obsrValue: '55' },
        { category: 'T1H', obsrValue: '21.4' },
    ];
    assert.deepEqual(parseNowcast(items), { temp: 21.4, pty: 0 });
});

test('초단기실황에 기온이 없으면 오류', () => {
    assert.throws(() => parseNowcast([{ category: 'PTY', obsrValue: '0' }]));
});

test('단기예보에서 지금 이후 가장 가까운 시간대 값을 고름', () => {
    const slot = (time, pop, sky, pty) => [
        { category: 'POP', fcstDate: '20261001', fcstTime: time, fcstValue: String(pop) },
        { category: 'SKY', fcstDate: '20261001', fcstTime: time, fcstValue: String(sky) },
        { category: 'PTY', fcstDate: '20261001', fcstTime: time, fcstValue: String(pty) },
        { category: 'TMP', fcstDate: '20261001', fcstTime: time, fcstValue: '20' },
    ];
    const items = [...slot('1300', 60, 4, 1), ...slot('1200', 20, 3, 0)];

    assert.deepEqual(pickForecast(items, kst('2026-10-01T11:20:00')), { pop: 20, sky: 3, pty: 0 });
    assert.deepEqual(pickForecast(items, kst('2026-10-01T12:40:00')), { pop: 20, sky: 3, pty: 0 });
    assert.deepEqual(pickForecast(items, kst('2026-10-01T13:05:00')), { pop: 60, sky: 4, pty: 1 });
});

test('단기예보에 현재 이후 시간대가 없으면 오류', () => {
    const items = [{ category: 'POP', fcstDate: '20261001', fcstTime: '0900', fcstValue: '10' }];
    assert.throws(() => pickForecast(items, kst('2026-10-01T11:20:00')));
});
