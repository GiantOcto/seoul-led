import React, { useState, useEffect } from "react";
import "./Weather.css";

const AIR_KOREA_KEY = "hdY4oBjOnFqA%2BJyW%2Bkzoyx0iCeR8iu5iz4L2gHBvK3C%2FzN8ATC5DxGOPBBimYveDh1LXwswQxuLEGQvxeNe1eg%3D%3D";
const SEOUL_API_KEY = "465456775772656e3532726c4a4d74";

// 미세먼지 측정소 (에어코리아·서울시 공통 이름) — 구별 브랜치마다 다름
const STATION_NAME = "강남구";

const REFRESH_INTERVAL = 60 * 60 * 1000; // 성공 후 1시간마다 새 값으로 갱신
const RETRY_DELAY = 60 * 1000; // 실패 시 1분 뒤 재시도 (부팅 직후 인터넷 미연결 등)
const CACHE_KEY = `airQuality_cache_${STATION_NAME}`;
const CACHE_TIME_KEY = `airQuality_time_${STATION_NAME}`;

function readCache() {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    const time = parseInt(localStorage.getItem(CACHE_TIME_KEY), 10);
    if (!data || !Number.isFinite(time)) return null;
    return { data: JSON.parse(data), time };
  } catch (e) {
    console.error("캐시 읽기 실패:", e);
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
  } catch (e) {
    console.error("캐시 저장 실패:", e);
  }
}

/** 에어코리아 → 실패 시 서울시 API. 성공하면 { pm10Value, pm25Value ... }, 둘 다 실패면 null */
async function fetchAirQuality() {
  try {
    const airKoreaUrl = `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?stationName=${encodeURIComponent(STATION_NAME)}&dataTerm=daily&pageNo=1&numOfRows=1&returnType=json&ver=1.3&serviceKey=${AIR_KOREA_KEY}`;
    const airKoreaJson = await (await fetch(airKoreaUrl)).json();
    const item = airKoreaJson?.response?.body?.items?.[0];
    if (item) return item;
    console.warn("에어코리아 응답에 데이터 없음:", airKoreaJson?.response?.header);
  } catch (e) {
    console.warn("에어코리아 에러:", e.message);
  }

  try {
    const seoulUrl = `http://openAPI.seoul.go.kr:8088/${SEOUL_API_KEY}/json/RealtimeCityAir/1/25/`;
    const seoulJson = await (await fetch(seoulUrl)).json();
    // 서울시 API 항목명 변경 대응 (신: MSRSTN_NM/PM/FPM, 구: MSRSTE_NM/PM10/PM25)
    const row = seoulJson?.RealtimeCityAir?.row?.find(
      (r) => (r.MSRSTN_NM ?? r.MSRSTE_NM) === STATION_NAME
    );
    if (row) return { pm10Value: row.PM ?? row.PM10, pm25Value: row.FPM ?? row.PM25 };
    console.warn("서울시 API 응답에 측정소 없음:", seoulJson?.RealtimeCityAir?.RESULT);
  } catch (e) {
    console.warn("서울시 API 에러:", e.message);
  }

  return null;
}

function Weather({ onWeatherUpdate }) {
  const [pollutionData, setPollutionData] = useState(null);

  // 시작 시 캐시 표시 → 1시간마다 갱신, 실패하면 1분마다 재시도 (페이지를 오래 켜둬도 값이 갱신되게)
  useEffect(() => {
    let timer = null;
    let cancelled = false;

    const load = async () => {
      const data = await fetchAirQuality();
      if (cancelled) return;
      if (data) {
        writeCache(data);
        setPollutionData(data);
        timer = setTimeout(load, REFRESH_INTERVAL);
        return;
      }
      console.error("미세먼지 API 모두 실패 — 1분 뒤 재시도 (이전 값이 있으면 유지)");
      timer = setTimeout(load, RETRY_DELAY);
    };

    const cached = readCache();
    if (cached) setPollutionData(cached.data);
    const age = cached ? Date.now() - cached.time : Infinity;
    if (age < REFRESH_INTERVAL) {
      timer = setTimeout(load, REFRESH_INTERVAL - age);
    } else {
      load();
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // ⭐ 데이터 변경 시 처리
  useEffect(() => {
    if (!pollutionData) return;

    const pm10 = parseInt(pollutionData.pm10Value) || 0;
    const pm2_5 = parseInt(pollutionData.pm25Value) || 0;

    const pm10Grade = getPM10Grade(pm10);
    const pm2_5Grade = getpm2_5Grade(pm2_5);

    // 부모 컴포넌트에 데이터 전달
    if (onWeatherUpdate) {
      onWeatherUpdate({
        pm10Grade: pm10Grade.text,
        pm2_5Grade: pm2_5Grade.text,
      });
    }
  }, [pollutionData]);

  const getpm2_5Grade = (pm2_5) => {
    if (pm2_5 <= 15) return { text: "좋음", color: "rgb(0, 146, 215)" };
    if (pm2_5 <= 35) return { text: "보통", color: "rgb(142, 195, 31)" };
    if (pm2_5 <= 75) return { text: "나쁨", color: "rgb(255, 196, 25)" };
    return { text: "매우나쁨", color: "lightcoral" };
  };

  const getPM10Grade = (pm10) => {
    if (pm10 <= 30) return { text: "좋음", color: "rgb(0, 146, 215)" };
    if (pm10 <= 80) return { text: "보통", color: "rgb(142, 195, 31)" };
    if (pm10 <= 150) return { text: "나쁨", color: "rgb(255, 196, 25)" };
    return { text: "매우나쁨", color: "lightcoral" };
  };

  // 로딩 상태
  if (!pollutionData) {
    return (
      <div className="weather-container">
        <div>Loading...</div>
      </div>
    );
  }

  // 에어코리아 데이터 파싱
  const pm10 = parseInt(pollutionData.pm10Value) || 0;
  const pm2_5 = parseInt(pollutionData.pm25Value) || 0;

  const pm10Grade = getPM10Grade(pm10);
  const pm2_5Grade = getpm2_5Grade(pm2_5);

  return (
    <div className="weather-container">
      <div className="air-quality">
        <div className="pm10">
          <span style={{ color: pm10Grade.color }}>미세먼지</span>

          <div className="emoji">
            <img
              src={`/images/${pm10Grade.text}.svg`}
              alt={pm10Grade.text}
              style={{ color: pm10Grade.color }}
            />
          </div>

          <div className="grade">
            <p
              className={`grade-text ${
                pm10Grade.text.length === 2 ? "two-chars" : ""
              }`}
              style={{ color: pm10Grade.color }}
            >
              {pm10Grade.text}
            </p>
          </div>
        </div>

        <div className="pm2_5">
          <span style={{ color: pm2_5Grade.color }}>
            초미세먼지
          </span>

          <div className="emoji">
            <img src={`/images/${pm2_5Grade.text}.svg`} alt={pm2_5Grade.text} />
          </div>

          <div className="grade">
            <p
              className={`grade-text ${
                pm2_5Grade.text.length === 2 ? "two-chars" : ""
              }`}
              style={{ color: pm2_5Grade.color }}
            >
              {pm2_5Grade.text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Weather;