
import React, { useState, useEffect } from "react";
import "./Weather.css";

const AIR_KOREA_KEY = "hdY4oBjOnFqA%2BJyW%2Bkzoyx0iCeR8iu5iz4L2gHBvK3C%2FzN8ATC5DxGOPBBimYveDh1LXwswQxuLEGQvxeNe1eg%3D%3D";
const SEOUL_API_KEY = "465456775772656e3532726c4a4d74";

function Weather({ onWeatherUpdate }) {
  const [pollutionData, setPollutionData] = useState(null);

  // 캐시 관리 설정
  const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3시간
  const CACHE_KEY = 'songpaAirQuality_cache';
  const CACHE_TIME_KEY = 'songpaAirQuality_time';

  // 앱 시작시 구로구 미세먼지만 호출
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

        // ⭐ 1단계: 에어코리아 API 시도
        console.log("1단계: 에어코리아 API 시도...");
        try {
          const airKoreaUrl = `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?stationName=구로구&dataTerm=daily&pageNo=1&numOfRows=1&returnType=json&ver=1.3&serviceKey=${AIR_KOREA_KEY}`;
          
          const airKoreaResponse = await fetch(airKoreaUrl);
          const airKoreaJson = await airKoreaResponse.json();

          if (airKoreaJson?.response?.body?.items?.[0]) {
            console.log("✅ 에어코리아 API 성공");
            const data = airKoreaJson.response.body.items[0];
            
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
            setPollutionData(data);
            return;
          }
        } catch (e) {
          console.log("⚠️ 에어코리아 에러:", e.message);
        }

        // ⭐ 2단계: 서울시 API 시도
        console.log("⚠️ 에어코리아 실패, 서울시 API 시도...");
        const seoulUrl = `http://openAPI.seoul.go.kr:8088/${SEOUL_API_KEY}/json/RealtimeCityAir/1/25/`;
        
        const seoulResponse = await fetch(seoulUrl);
        const seoulJson = await seoulResponse.json();
        
        if (seoulJson?.RealtimeCityAir?.row) {
          const songpaData = seoulJson.RealtimeCityAir.row.find(
            item => item.MSRSTE_NM === "구로구"
          );
          
          if (songpaData) {
            console.log("✅ 서울시 API 성공");
            // 에어코리아 형식으로 변환
            const converted = {
              pm10Value: songpaData.PM10,
              pm25Value: songpaData.PM25
            };
            
            localStorage.setItem(CACHE_KEY, JSON.stringify(converted));
            localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
            setPollutionData(converted);
            return;
          }
        }

        throw new Error("모든 API 실패");

      } catch (error) {
        console.error("❌ 모든 API 실패, 캐시 사용:", error);
        
        // ⭐ 3단계: 캐시 사용
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