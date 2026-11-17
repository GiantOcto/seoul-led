/**
 * 에어코리아 대기오염정보 (공공데이터포털) — 측정소 실시간 미세먼지(PM10)
 * 기상청 날씨와 같은 공공데이터포털 인증키로 조회됨
 */
const AIR_URL = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty';

/** PM10(㎍/㎥) → 등급 (성남 768 화면과 같은 기준) */
function pm10Grade(pm10) {
    if (pm10 <= 30) return '좋음';
    if (pm10 <= 80) return '보통';
    if (pm10 <= 150) return '나쁨';
    return '매우나쁨';
}

/** 측정소 응답 items → PM10 숫자. 점검·통신장애로 값이 "-" 이거나 비면 null */
function parsePm10(items) {
    const pm10 = parseInt(items?.[0]?.pm10Value, 10);
    return Number.isFinite(pm10) ? pm10 : null;
}

async function fetchStationPm10(stationName, serviceKey) {
    // 공공데이터포털 "인코딩" 키는 그대로, "디코딩" 키는 인코딩해서 사용
    const key = serviceKey.includes('%') ? serviceKey : encodeURIComponent(serviceKey);
    const query = new URLSearchParams({
        stationName, dataTerm: 'daily', pageNo: '1', numOfRows: '1', returnType: 'json', ver: '1.3',
    }).toString();
    const res = await fetch(`${AIR_URL}?serviceKey=${key}&${query}`);
    const text = await res.text();
    let body;
    try {
        body = JSON.parse(text);
    } catch {
        throw new Error(`에어코리아 HTTP ${res.status} 응답이 JSON 아님: ${text.slice(0, 120)}`);
    }
    const header = body?.response?.header;
    if (header?.resultCode !== '00') throw new Error(`에어코리아 ${header?.resultMsg || `HTTP ${res.status}`}`);
    return parsePm10(body.response.body.items);
}

/** 측정소를 앞에서부터 조회해 처음 나온 값으로 { pm10, grade, station } (모두 비면 code 'NO_PM10' 오류) */
async function fetchPm10({ serviceKey, stations }) {
    for (const station of stations) {
        const pm10 = await fetchStationPm10(station, serviceKey);
        if (pm10 !== null) return { pm10, grade: pm10Grade(pm10), station };
    }
    const err = new Error(`측정소 ${stations.join('·')} 모두 PM10 값 없음`);
    err.code = 'NO_PM10'; // 조회는 된 것 (점검중) — 서버가 빨리 다시 부르지 않게 구분
    throw err;
}

module.exports = { fetchPm10, pm10Grade, parsePm10 };
