import React, { useState, useEffect } from "react";
import "./Weather.css";

const AIR_KOREA_KEY = "hdY4oBjOnFqA%2BJyW%2Bkzoyx0iCeR8iu5iz4L2gHBvK3C%2FzN8ATC5DxGOPBBimYveDh1LXwswQxuLEGQvxeNe1eg%3D%3D";

function Weather({ selectedDistrict, onWeatherUpdate }) {
  const [pollutionData, setPollutionData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedDistrict) return;

      try {
        // 에어코리아 시도별 API (PM2.5 포함)
        const pollutionUrl = `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?sidoName=서울&pageNo=1&numOfRows=100&returnType=json&ver=1.3&serviceKey=${AIR_KOREA_KEY}`;

        const pollutionResponse = await fetch(pollutionUrl);
        const pollutionJson = await pollutionResponse.json();

        setPollutionData(pollutionJson);

        // 해당 구 데이터 찾기
        const targetStation = pollutionJson.response.body.items.find(item => 
          item.stationName === selectedDistrict
        );

        if (targetStation) {
          const pm10 = parseInt(targetStation.pm10Value) || 0;
          const pm2_5 = parseInt(targetStation.pm25Value) || 0;

          const pm10Grade = getPM10Grade(pm10);
          const pm2_5Grade = getpm2_5Grade(pm2_5);

          onWeatherUpdate({
            pm10Grade: pm10Grade.text,
            pm2_5Grade: pm2_5Grade.text,
          });
        }
      } catch (error) {
        console.error("에어코리아 API 에러:", error);
      }
    };

    fetchData();
  }, [selectedDistrict, onWeatherUpdate]);

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

  if (!pollutionData) return <div>Loading...</div>;

  // 해당 구 데이터 찾기
  const targetStation = pollutionData.response.body.items.find(item => 
    item.stationName === selectedDistrict
  );

  if (!targetStation) return <div>해당 지역 데이터를 찾을 수 없습니다.</div>;

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