/**
 * 기상청 단기예보 조회서비스 (공공데이터포털)
 * - 초단기실황: 현재 기온(T1H), 지금 강수형태(PTY)
 * - 단기예보: 가장 가까운 시간대의 하늘상태(SKY), 강수확률(POP)
 */
const KMA_BASE = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';
const FORECAST_BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23]; // 단기예보 발표시각
const NOWCAST_READY_MINUTE = 45;  // 초단기실황은 매시 40분 이후 제공 → 여유 두고 45분
const FORECAST_READY_MINUTES = 15; // 단기예보는 발표 10분 이후 제공 → 여유 두고 15분
const KST_OFFSET_MINUTES = 9 * 60;

const pad2 = (n) => String(n).padStart(2, '0');

/** 서버 PC 시간대와 관계없이 KST 기준 날짜/시각을 읽을 수 있는 Date (getHours 등이 KST 값) */
function toKst(date) {
    return new Date(date.getTime() + (KST_OFFSET_MINUTES + date.getTimezoneOffset()) * 60000);
}

const ymd = (d) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;

/** 초단기실황 기준시각: 45분 전이면 이전 정시 */
function nowcastBase(now) {
    const kst = toKst(now);
    const base = kst.getMinutes() < NOWCAST_READY_MINUTE
        ? new Date(kst.getTime() - 60 * 60000)
        : kst;
    return { base_date: ymd(base), base_time: `${pad2(base.getHours())}00` };
}

/** 단기예보 기준시각: 15분 여유를 둔 가장 최근 발표시각 (02시 전이면 전날 23시) */
function forecastBase(now) {
    const kst = new Date(toKst(now).getTime() - FORECAST_READY_MINUTES * 60000);
    const hour = [...FORECAST_BASE_HOURS].reverse().find((h) => h <= kst.getHours());
    if (hour === undefined) {
        const yesterday = new Date(kst.getTime() - 24 * 60 * 60000);
        return { base_date: ymd(yesterday), base_time: '2300' };
    }
    return { base_date: ymd(kst), base_time: `${pad2(hour)}00` };
}

/** 강수형태(PTY)·하늘상태(SKY) → 화면 아이콘 종류 */
function skyKind(pty, sky) {
    if (pty === 3 || pty === 7) return 'snow';            // 눈, 눈날림
    if ([1, 2, 4, 5, 6].includes(pty)) return 'rain';     // 비, 비/눈, 소나기, 빗방울, 빗방울눈날림
    if (sky === 1) return 'clear';
    if (sky === 3) return 'partly';
    return 'cloudy';
}

/** 초단기실황 items → { temp, pty } */
function parseNowcast(items) {
    const value = (category) => items.find((it) => it.category === category)?.obsrValue;
    const temp = Number(value('T1H'));
    const pty = Number(value('PTY'));
    if (!Number.isFinite(temp) || !Number.isFinite(pty)) throw new Error('초단기실황에 T1H/PTY 없음');
    return { temp, pty };
}

/** 단기예보 items 중 지금 시각 이후 가장 가까운 시간대의 { pop, sky, pty } */
function pickForecast(items, now) {
    const kst = toKst(now);
    const currentSlot = `${ymd(kst)}${pad2(kst.getHours())}00`;
    const slots = [...new Set(items.map((it) => `${it.fcstDate}${it.fcstTime}`))]
        .filter((slot) => slot >= currentSlot)
        .sort();
    const slot = slots[0];
    if (!slot) throw new Error('단기예보에 현재 이후 시간대 없음');

    const value = (category) =>
        Number(items.find((it) => `${it.fcstDate}${it.fcstTime}` === slot && it.category === category)?.fcstValue);
    const pop = value('POP');
    const sky = value('SKY');
    const pty = value('PTY');
    if (!Number.isFinite(pop) || !Number.isFinite(sky)) throw new Error('단기예보에 POP/SKY 없음');
    return { pop, sky, pty };
}

async function callKma(service, params, serviceKey) {
    // 공공데이터포털 "인코딩" 키는 그대로, "디코딩" 키는 인코딩해서 사용
    const key = serviceKey.includes('%') ? serviceKey : encodeURIComponent(serviceKey);
    const query = new URLSearchParams({ ...params, dataType: 'JSON', pageNo: '1' }).toString();
    const res = await fetch(`${KMA_BASE}/${service}?serviceKey=${key}&${query}`);
    const text = await res.text();
    let body;
    try {
        body = JSON.parse(text);
    } catch {
        throw new Error(`${service} HTTP ${res.status} 응답이 JSON 아님: ${text.slice(0, 120)}`);
    }
    // 키 미등록 등 인증 오류는 HTTP 403 + 이 형식으로 옴 (예: SERVICE_KEY_IS_NOT_REGISTERED_ERROR)
    const authError = body?.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg;
    if (authError) throw new Error(`${service} ${authError}`);
    if (!res.ok) throw new Error(`${service} HTTP ${res.status}`);
    const header = body?.response?.header;
    if (header?.resultCode !== '00') throw new Error(`${service} ${header?.resultMsg || '알 수 없는 오류'}`);
    return body.response.body.items.item;
}

/** 기상청에서 받아 화면용 { temp, sky, pop } 으로 정리 */
async function fetchKmaWeather({ serviceKey, nx, ny, now = new Date() }) {
    const grid = { nx: String(nx), ny: String(ny) };
    const [nowcastItems, forecastItems] = await Promise.all([
        callKma('getUltraSrtNcst', { ...grid, ...nowcastBase(now), numOfRows: '10' }, serviceKey),
        callKma('getVilageFcst', { ...grid, ...forecastBase(now), numOfRows: '60' }, serviceKey),
    ]);
    const nowcast = parseNowcast(nowcastItems);
    const forecast = pickForecast(forecastItems, now);
    // 지금 비/눈이 오면 실황 우선, 아니면 예보의 강수형태·하늘상태
    const pty = nowcast.pty !== 0 ? nowcast.pty : forecast.pty;
    return {
        temp: Math.round(nowcast.temp),
        sky: skyKind(pty, forecast.sky),
        pop: forecast.pop,
    };
}

module.exports = { fetchKmaWeather, nowcastBase, forecastBase, skyKind, parseNowcast, pickForecast };
