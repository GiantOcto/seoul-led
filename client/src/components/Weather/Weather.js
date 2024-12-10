import React, { useState, useEffect } from "react";
import "./Weather.css";

const API_KEY = "5eac919650d7cf8b33e02a273b7abdc6";

const districtCoordinates = {
  강남구: { latitude: 37.5006, longitude: 127.0508 },
  강동구: { latitude: 37.5471, longitude: 127.1419 },
  강북구: { latitude: 37.6405, longitude: 127.0092 },
  강서구: { latitude: 37.5583, longitude: 126.8322 },
  관악구: { latitude: 37.4673, longitude: 126.9483 },
  광진구: { latitude: 37.5447, longitude: 127.0809 },
  구로구: { latitude: 37.4986, longitude: 126.8592 },
  금천구: { latitude: 37.4601, longitude: 126.9016 },
  노원구: { latitude: 37.6515, longitude: 127.0732 },
  도봉구: { latitude: 37.6665, longitude: 127.0306 },
  동대문구: { latitude: 37.5832, longitude: 127.0551 },
  동작구: { latitude: 37.5031, longitude: 126.9549 },
  마포구: { latitude: 37.5666, longitude: 126.9015 },
  서대문구: { latitude: 37.5791, longitude: 126.9368 },
  서초구: { latitude: 37.4791, longitude: 127.0153 },
  성동구: { latitude: 37.5505, longitude: 127.0415 },
  성북구: { latitude: 37.5982, longitude: 127.0216 },
  송파구: { latitude: 37.5076, longitude: 127.1168 },
  양천구: { latitude: 37.5228, longitude: 126.8544 },
  영등포구: { latitude: 37.5174, longitude: 126.9081 },
  용산구: { latitude: 37.5326, longitude: 126.9809 },
  은평구: { latitude: 37.6164, longitude: 126.9289 },
  종로구: { latitude: 37.5803, longitude: 126.9831 },
  중구: { latitude: 37.5637, longitude: 126.9975 },
  중랑구: { latitude: 37.598, longitude: 127.0927 },
};

function Weather({ selectedDistrict, onWeatherUpdate }) {
  const [weatherData, setWeatherData] = useState(null);
  const [pollutionData, setPollutionData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedDistrict) return;

      const { latitude: lat, longitude: lon } =
        districtCoordinates[selectedDistrict];

      try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`;
        const pollutionUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

        const [weatherResponse, pollutionResponse] = await Promise.all([
          fetch(weatherUrl),
          fetch(pollutionUrl),
        ]);

        const weatherJson = await weatherResponse.json();
        const pollutionJson = await pollutionResponse.json();

        setWeatherData(weatherJson);
        setPollutionData(pollutionJson);

        const pm10 = pollutionJson.list[0].components.pm10;
        const o3 = pollutionJson.list[0].components.o3;

        const pm10Grade = getPM10Grade(pm10);
        const o3Grade = getO3Grade(o3);

        onWeatherUpdate({
          pm10Grade: pm10Grade.text, // "좋음", "보통" 등의 텍스트
          o3Grade: o3Grade.text,
        });
      } catch (error) {
        console.error("에러 발생:", error);
      }
    };

    fetchData();
  }, [selectedDistrict, onWeatherUpdate]);

  const getO3Grade = (o3) => {
    if (o3 <= 60) return { text: "좋음", color: "rgb(0, 146, 215)" };
    if (o3 <= 90) return { text: "보통", color: "rgb(142, 195, 31)" };
    if (o3 <= 150) return { text: "나쁨", color: "rgb(255, 196, 25)" };
    return { text: "매우나쁨", color: "lightcoral" };
  };

  const getPM10Grade = (pm10) => {
    if (pm10 <= 30) return { text: "좋음", color: "rgb(0, 146, 215)" };
    if (pm10 <= 80) return { text: "보통", color: "rgb(142, 195, 31)" };
    if (pm10 <= 150) return { text: "나쁨", color: "rgb(255, 196, 25)" };
    return { text: "매우나쁨", color: "lightcoral" };
  };

  const getTemperatureColor = (temp) => {
    if (temp > 25) return "lightcoral";
    if (temp > 10) return "orange";
    return "lightblue";
  };

  const getKoreanDescription = (description) => {
    const translations = {
      튼구름: "구름보통",
      온흐림: "구름많음",
    };
    return translations[description] || description;
  };

  if (!weatherData || !pollutionData) return <div>Loading...</div>;

  const temperature = weatherData.main.temp;
  const description = getKoreanDescription(weatherData.weather[0].description);
  const icon = weatherData.weather[0].icon.replace("n", "d");
  const iconURL = `https://openweathermap.org/img/wn/${icon}@2x.png`;

  const pm10 = pollutionData.list[0].components.pm10;
  const o3 = pollutionData.list[0].components.o3;

  const pm10Grade = getPM10Grade(pm10);
  const o3Grade = getO3Grade(o3);
  const tempColor = getTemperatureColor(temperature);

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

        <div className="o3">
          <span style={{ color: o3Grade.color }}>
            오&nbsp;&nbsp;&nbsp;&nbsp;존
          </span>

          <div className="emoji">
            <img src={`/images/${o3Grade.text}.svg`} alt={pm10Grade.text} />
          </div>

          <div className="grade">
            <p
              className={`grade-text ${
                o3Grade.text.length === 2 ? "two-chars" : ""
              }`}
              style={{ color: o3Grade.color }}
            >
              {o3Grade.text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Weather;
