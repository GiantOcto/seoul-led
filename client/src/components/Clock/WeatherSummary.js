import React from "react";
import { useWeather } from "./useWeather";
import "./WeatherSummary.css";

const CLOUD_PATH = "a9 9 0 0 1 2-17.6 a12 12 0 0 1 23 2.6 a8 8 0 0 1 1 15 Z";
const cloud = (x, y) => <path d={`M${x} ${y} ${CLOUD_PATH}`} fill="#cbd5e1" />;

const ICONS = {
  clear: (
    <>
      <circle r="8" fill="#fbbf24" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line key={deg} y1="-12" y2="-16" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" transform={`rotate(${deg})`} />
      ))}
    </>
  ),
  partly: (
    <>
      <circle cx="-6" cy="-6" r="7" fill="#fbbf24" />
      {cloud(-12, 12)}
    </>
  ),
  cloudy: cloud(-14, 8),
  rain: (
    <>
      {cloud(-14, 2)}
      <g stroke="#38bdf8" strokeWidth="3" strokeLinecap="round">
        <line x1="-8" y1="10" x2="-10" y2="16" />
        <line x1="0" y1="10" x2="-2" y2="16" />
        <line x1="8" y1="10" x2="6" y2="16" />
      </g>
    </>
  ),
  snow: (
    <>
      {cloud(-14, 2)}
      <g fill="#e0f2fe">
        <circle cx="-8" cy="13" r="2" />
        <circle cx="0" cy="15" r="2" />
        <circle cx="8" cy="13" r="2" />
      </g>
    </>
  ),
};

// 미세먼지 등급 색 (성남 768 화면과 같은 색)
const DUST_COLORS = {
  좋음: "rgb(0, 146, 215)",
  보통: "rgb(142, 195, 31)",
  나쁨: "rgb(255, 196, 25)",
  매우나쁨: "lightcoral",
};

/** 날씨 아이콘 + 현재 기온 + 강수확률 + 미세먼지 등급 (아직 못 받은 건 안 그림) */
function WeatherSummary() {
  const weather = useWeather();
  if (!weather) return null;

  return (
    <div className="weather-summary">
      {weather.temp !== undefined && (
        <>
          <div className="weather-summary-main">
            <svg width="32" height="32" viewBox="-20 -20 40 40" aria-hidden="true">
              {ICONS[weather.sky] || ICONS.cloudy}
            </svg>
            <span className="weather-summary-temp">{weather.temp}°</span>
          </div>
          <div className="weather-summary-pop">
            강수확률 <span className="weather-summary-pop-value">{weather.pop}%</span>
          </div>
        </>
      )}
      {weather.dust && (
        <div className="weather-summary-dust">
          미세먼지 <span style={{ color: DUST_COLORS[weather.dust.grade] }}>{weather.dust.grade}</span>
        </div>
      )}
    </div>
  );
}

export default WeatherSummary;
