import React, { useState, useEffect } from "react";
import { getSensorData } from "../../services/relayApi";
import "./SentrionSensor.css";

function SentrionSensor() {
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
        // 에러가 있어도 조용히 처리 (LED 화면에서는 표시 안 함)
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
      <div className="sentrion-sensor">
        <div className="sentrion-loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="sentrion-sensor">
      <div className="sentrion-container">
        <div className="sentrion-item sentrion-temp">
          <span className="sentrion-label">온도</span>
          <div className="sentrion-grade">
            <p className="sentrion-grade-text">
              {formatValue(sensorData?.sentrionTemp)}°C
            </p>
          </div>
        </div>
        <div className="sentrion-item sentrion-humidity">
          <span className="sentrion-label">습도</span>
          <div className="sentrion-grade">
            <p className="sentrion-grade-text">
              {formatValue(sensorData?.sentrionHumidity)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SentrionSensor;

