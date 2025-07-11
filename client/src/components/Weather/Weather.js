import React, { useState, useEffect } from "react";
import "./Weather.css";

const AIR_KOREA_KEY = "hdY4oBjOnFqA%2BJyW%2Bkzoyx0iCeR8iu5iz4L2gHBvK3C%2FzN8ATC5DxGOPBBimYveDh1LXwswQxuLEGQvxeNe1eg%3D%3D";

function Weather({ selectedDistrict, onWeatherUpdate }) {
  const [pollutionData, setPollutionData] = useState(null);
  const [allSeoulData, setAllSeoulData] = useState(null);

  // 캐시 관리 설정
  const CACHE_DURATION = 60 * 60 * 1000; // 1시간
  const CACHE_KEY = 'seoulAirQuality_cache';
  const CACHE_TIME_KEY = 'seoulAirQuality_time';

  // 앱 시작시 서울시 전체 미세먼지 데이터 호출 (1시간 캐싱)
  useEffect(() => {
    const fetchAllSeoulData = async () => {
      try {
        // localStorage에서 캐시 확인
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
        
        // 캐시가 있고 1시간 이내면 API 호출 안함
        if (cachedData && cachedTime && 
            (Date.now() - parseInt(cachedTime) < CACHE_DURATION)) {
          const parsedData = JSON.parse(cachedData);
          setAllSeoulData(parsedData);
          setPollutionData(parsedData);
          return;
        }

        // 1시간 지났거나 캐시 없으면 API 호출
        const pollutionUrl = `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?sidoName=서울&pageNo=1&numOfRows=100&returnType=json&ver=1.3&serviceKey=${AIR_KOREA_KEY}`;

        const pollutionResponse = await fetch(pollutionUrl);
        const pollutionJson = await pollutionResponse.json();

        if (!pollutionJson?.response?.body?.items) {
          console.error("날씨 API 응답 오류:", pollutionJson);
          return;
        }

        // localStorage에 저장
        localStorage.setItem(CACHE_KEY, JSON.stringify(pollutionJson));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());

        setAllSeoulData(pollutionJson);
        setPollutionData(pollutionJson);

      } catch (error) {
        console.error("날씨 API 호출 실패:", error);
        
        // API 실패시 기존 캐시라도 사용
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          setAllSeoulData(parsedData);
          setPollutionData(parsedData);
        }
      }
    };

    fetchAllSeoulData();
    
    // 1시간마다 캐시 체크하여 자동 API 호출
    const checkHourly = () => {
      const hourlyInterval = setInterval(() => {
        fetchAllSeoulData(); // 1시간마다 체크
      }, 60 * 60 * 1000); // 1시간 (3600초)
      
      // cleanup 함수에서 interval 정리
      return () => clearInterval(hourlyInterval);
    };
    
    const cleanupHourly = checkHourly();
    
    // useEffect cleanup 함수
    return () => {
      if (cleanupHourly) {
        cleanupHourly();
      }
    };
  }, []); // 앱 시작시 1회만

  // selectedDistrict 변경시 필터링만 수행 (API 호출 없음)
  useEffect(() => {
    if (!allSeoulData || !selectedDistrict) return;

    try {
      // 전체 서울시 데이터에서 해당 구 찾기
      const targetStation = allSeoulData.response.body.items.find(item => 
        item.stationName === selectedDistrict
      );

      if (targetStation) {
        const pm10 = parseInt(targetStation.pm10Value) || 0;
        const pm2_5 = parseInt(targetStation.pm25Value) || 0;

        const pm10Grade = getPM10Grade(pm10);
        const pm2_5Grade = getpm2_5Grade(pm2_5);

        // 부모 컴포넌트에 데이터 전달
        onWeatherUpdate({
          pm10Grade: pm10Grade.text,
          pm2_5Grade: pm2_5Grade.text,
        });
      }
    } catch (error) {
      console.error("데이터 필터링 오류:", error);
    }
  }, [selectedDistrict, allSeoulData, onWeatherUpdate]);

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

  // 해당 구 데이터 찾기
  const targetStation = pollutionData.response.body.items.find(item => 
    item.stationName === selectedDistrict
  );

  if (!targetStation) {
    return (
      <div className="weather-container">
        <div>해당 지역 데이터를 찾을 수 없습니다.</div>
      </div>
    );
  }

  // 에어코리아 데이터 파싱
  const pm10 = parseInt(targetStation.pm10Value) || 0;
  const pm2_5 = parseInt(targetStation.pm25Value) || 0;

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