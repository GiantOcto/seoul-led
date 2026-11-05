const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchPm10, pm10Grade, parsePm10 } = require('./airQuality');

/** 측정소 이름 → pm10Value 로 응답하는 가짜 fetch */
function fakeFetch(valuesByStation) {
    return async (url) => {
        const station = new URL(url).searchParams.get('stationName');
        const body = {
            response: {
                header: { resultCode: '00', resultMsg: 'NORMAL_CODE' },
                body: { items: [{ pm10Value: valuesByStation[station] }] },
            },
        };
        return { status: 200, text: async () => JSON.stringify(body) };
    };
}

async function withFetch(fake, fn) {
    const original = globalThis.fetch;
    globalThis.fetch = fake;
    try {
        return await fn();
    } finally {
        globalThis.fetch = original;
    }
}

test('PM10 등급 경계값', () => {
    assert.equal(pm10Grade(30), '좋음');
    assert.equal(pm10Grade(31), '보통');
    assert.equal(pm10Grade(80), '보통');
    assert.equal(pm10Grade(81), '나쁨');
    assert.equal(pm10Grade(150), '나쁨');
    assert.equal(pm10Grade(151), '매우나쁨');
});

test('PM10 값이 "-" 이거나 없으면 null', () => {
    assert.equal(parsePm10([{ pm10Value: '31' }]), 31);
    assert.equal(parsePm10([{ pm10Value: '-' }]), null);
    assert.equal(parsePm10([]), null);
    assert.equal(parsePm10(undefined), null);
});

test('첫 측정소 값이 비면 다음 측정소 값 사용', async () => {
    const result = await withFetch(fakeFetch({ 상대원동: '-', 단대동: '45' }), () =>
        fetchPm10({ serviceKey: 'k', stations: ['상대원동', '단대동'] }),
    );
    assert.deepEqual(result, { pm10: 45, grade: '보통', station: '단대동' });
});

test('모든 측정소 값이 비면 오류', async () => {
    await withFetch(fakeFetch({ 상대원동: '-', 단대동: '' }), () =>
        assert.rejects(fetchPm10({ serviceKey: 'k', stations: ['상대원동', '단대동'] }), /PM10 값 없음/),
    );
});
