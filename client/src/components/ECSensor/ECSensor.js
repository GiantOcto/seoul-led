import React, { useState, useEffect } from "react";
import { getSensorData } from "../../services/relayApi";
import "./ECSensor.css";

function ECSensor() {
  const [sensorData, setSensorData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getSensorData();
        setSensorData(data);
        setError(null);
      } catch (err) {
        console.error("센서 데이터 가져오기 실패:", err);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    // 초기 데이터 로드
    fetchData();

    // 2초마다 데이터 갱신
    const interval = setInterval(fetchData, 2000);

    return () => clearInterval(interval);
  }, []);

  const formatValue = (value) => {
    if (value === null || value === undefined) return "--";
    return typeof value === "number" ? value.toFixed(1) : value;
  };

  if (loading) {
    return (
      <div className="ec-sensor">
        <div className="ec-loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="ec-sensor">
      <div className="ec-container">
        <div className="ec-item ec-temp">
          <span className="ec-label">함내온도</span>
          <div className="ec-grade">
            <p className="ec-grade-text">
              {formatValue(sensorData?.ecTemp)}°C
            </p>
          </div>
        </div>
        <div className="ec-item ec-humidity">
          <span className="ec-label">함내습도</span>
          <div className="ec-grade">
            <p className="ec-grade-text">
              {formatValue(sensorData?.ecHumidity)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ECSensor;

