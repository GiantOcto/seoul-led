import React, { useState, useEffect } from "react";
import "./Weather.css";

const AIR_KOREA_KEY = "hdY4oBjOnFqA%2BJyW%2Bkzoyx0iCeR8iu5iz4L2gHBvK3C%2FzN8ATC5DxGOPBBimYveDh1LXwswQxuLEGQvxeNe1eg%3D%3D";

// 성남시 측정소 (상대원동 기본, 안 뜨면 단대동 폴백)
const PRIMARY_STATION = "상대원동";
const FALLBACK_STATION = "단대동";

function Weather({ onWeatherUpdate }) {
  const [pollutionData, setPollutionData] = useState(null);

  // 캐시 관리 설정
  const CACHE_DURATION = 1 * 60 * 60 * 1000; // 1시간 (매 정시 갱신)
  const CACHE_KEY = 'seongnamAirQuality_cache';
  const CACHE_TIME_KEY = 'seongnamAirQuality_time';

  // 에어코리아 API 호출 헬퍼
  const fetchStation = async (stationName) => {
    const url = `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?stationName=${encodeURIComponent(stationName)}&dataTerm=daily&pageNo=1&numOfRows=1&returnType=json&ver=1.3&serviceKey=${AIR_KOREA_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    return json?.response?.body?.items?.[0] || null;
  };

  // 값이 유효한지 (숫자인지) 체크
  const isValidValue = (val) => val && val !== "-" && !isNaN(parseInt(val, 10));

  // 앱 시작시 성남시 미세먼지 호출
  useEffect(() => {
    const fetchAirData = async () => {
      try {
        // localStorage에서 캐시 확인
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

        // 캐시가 있고 1시간 이내면 API 호출 안함
        if (cachedData && cachedTime &&
            (Date.now() - parseInt(cachedTime, 10) < CACHE_DURATION)) {
          const parsedData = JSON.parse(cachedData);
          setPollutionData(parsedData);
          return;
        }

        // 1단계: 상대원동 API 시도
        console.log("1단계: 에어코리아 상대원동 시도...");

        let data = await fetchStation(PRIMARY_STATION);

        if (data) {
          let needFallback = false;

          if (!isValidValue(data.pm25Value) || !isValidValue(data.pm10Value)) {
            console.log("⚠️ 상대원동 데이터 불완전, 단대동 폴백...");
            needFallback = true;
          }

          if (needFallback) {
            const fallbackData = await fetchStation(FALLBACK_STATION);
            if (fallbackData) {
              if (!isValidValue(data.pm25Value) && isValidValue(fallbackData.pm25Value)) {
                data.pm25Value = fallbackData.pm25Value;
                console.log(`✅ 단대동 PM2.5: ${fallbackData.pm25Value}`);
              }
              if (!isValidValue(data.pm10Value) && isValidValue(fallbackData.pm10Value)) {
                data.pm10Value = fallbackData.pm10Value;
                console.log(`✅ 단대동 PM10: ${fallbackData.pm10Value}`);
              }
            }
          }

          console.log("✅ 에어코리아 API 성공");
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
          localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
          setPollutionData(data);
          return;
        }

        throw new Error("에어코리아 API 실패");

      } catch (error) {
        console.error("❌ API 실패, 캐시 사용:", error);

        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          try {
            console.log("📦 캐시 데이터 사용");
            setPollutionData(JSON.parse(cachedData));
          } catch (e) {
            console.error('캐시 파싱 실패:', e);
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem(CACHE_TIME_KEY);
          }
        }
      }
    };

    fetchAirData();

    // 매 정시에 갱신 (다음 정시까지 대기 후 1시간 간격)
    let hourlyInterval = null;
    const now = new Date();
    const msUntilNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();

    const firstTimer = setTimeout(() => {
      fetchAirData();
      hourlyInterval = setInterval(fetchAirData, 60 * 60 * 1000);
    }, msUntilNextHour);

    return () => {
      clearTimeout(firstTimer);
      if (hourlyInterval) clearInterval(hourlyInterval);
    };
  }, []);

  // 데이터 변경 시 처리
  useEffect(() => {
    if (!pollutionData) return;

    const pm10 = isValidValue(pollutionData.pm10Value) ? parseInt(pollutionData.pm10Value, 10) : null;
    const pm2_5 = isValidValue(pollutionData.pm25Value) ? parseInt(pollutionData.pm25Value, 10) : null;

    const pm10Grade = pm10 !== null ? getPM10Grade(pm10) : { text: "점검중", color: "#999" };
    const pm2_5Grade = pm2_5 !== null ? getpm2_5Grade(pm2_5) : { text: "점검중", color: "#999" };

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
  const pm10 = isValidValue(pollutionData.pm10Value) ? parseInt(pollutionData.pm10Value, 10) : null;
  const pm2_5 = isValidValue(pollutionData.pm25Value) ? parseInt(pollutionData.pm25Value, 10) : null;

  const pm10Grade = pm10 !== null ? getPM10Grade(pm10) : { text: "점검중", color: "#999" };
  const pm2_5Grade = pm2_5 !== null ? getpm2_5Grade(pm2_5) : { text: "점검중", color: "#999" };

  return (
    <div className="weather-container">
      <div className="air-quality">
        <div className="pm10">
          <span style={{ color: pm10Grade.color }}>미세먼지</span>

          <div className="emoji">
            {pm10Grade.text !== "점검중" ? (
              <img
                src={`/images/${pm10Grade.text}.svg`}
                alt={pm10Grade.text}
                style={{ color: pm10Grade.color }}
              />
            ) : (
              <span style={{ fontSize: "2em", color: pm10Grade.color }}>-</span>
            )}
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
            {pm2_5Grade.text !== "점검중" ? (
              <img src={`/images/${pm2_5Grade.text}.svg`} alt={pm2_5Grade.text} />
            ) : (
              <span style={{ fontSize: "2em", color: pm2_5Grade.color }}>-</span>
            )}
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