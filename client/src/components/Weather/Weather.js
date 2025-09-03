import React, { useState, useEffect } from "react";
import "./Weather.css";

const AIR_KOREA_KEY = "hdY4oBjOnFqA%2BJyW%2Bkzoyx0iCeR8iu5iz4L2gHBvK3C%2FzN8ATC5DxGOPBBimYveDh1LXwswQxuLEGQvxeNe1eg%3D%3D";

function Weather({ onWeatherUpdate }) {
  const [pollutionData, setPollutionData] = useState(null);

  // 캐시 관리 설정
  const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3시간
  const CACHE_KEY = 'seochoAirQuality_cache';
  const CACHE_TIME_KEY = 'seoulAirQuality_time';

  // 앱 시작시 중구 미세먼지만 호출
  useEffect(() => {
    const fetchSeochoData = async () => {
      try {
        // localStorage에서 캐시 확인
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
        
        // 캐시가 있고 3시간 이내면 API 호출 안함
        if (cachedData && cachedTime && 
            (Date.now() - parseInt(cachedTime) < CACHE_DURATION)) {
          const parsedData = JSON.parse(cachedData);
          setPollutionData(parsedData);
          return;
        }

        // ⭐ 중구만 받는 API
        const pollutionUrl = `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?stationName=중구&dataTerm=daily&pageNo=1&numOfRows=1&returnType=json&ver=1.3&serviceKey=${AIR_KOREA_KEY}`;

        const pollutionResponse = await fetch(pollutionUrl);
        const pollutionJson = await pollutionResponse.json();

        if (!pollutionJson?.response?.body?.items?.[0]) {
          console.error("날씨 API 응답 오류:", pollutionJson);
          return;
        }

        // ⭐ 첫번째 아이템만 저장
        const seochoData = pollutionJson.response.body.items[0];
        
        // localStorage에 저장
        localStorage.setItem(CACHE_KEY, JSON.stringify(seochoData));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());

        setPollutionData(seochoData);

      } catch (error) {
        console.error("날씨 API 호출 실패:", error);
        
        // API 실패시 기존 캐시라도 사용
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          try {
            setPollutionData(JSON.parse(cachedData));
          } catch (e) {
            console.error('날씨 캐시 파싱 실패:', e);
            localStorage.removeItem(CACHE_KEY);
          }
        }
      }
    };

    fetchSeochoData();
  }, []); // 앱 시작시 1회만

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