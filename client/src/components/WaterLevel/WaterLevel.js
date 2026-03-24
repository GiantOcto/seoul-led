import { useEffect, useState } from "react";
import io from "socket.io-client";
import { getSocketUrl } from "../../utils/socketUrl";
import "./WaterLevel.css";

const socket = io(getSocketUrl(), {
  transports: ["websocket"],
});

function WaterLevel({ onWaterLevelChange }) {
  const [waterLevel, setWaterLevel] = useState(0);

  useEffect(() => {
    // 초기 데이터 수신
    socket.on("initial_data", (data) => {
      if (data && data.length > 0) {
        const level = data[data.length - 1].water_level;
        const roundedLevel = parseFloat(level.toFixed(0));
        setWaterLevel(roundedLevel + 250);
        onWaterLevelChange((roundedLevel + 250)/1000);
      }
    });

    // 실시간 데이터 수신
    socket.on("new_data", (data) => {
      const level = data.water_level;
      const roundedLevel = parseFloat(level.toFixed(0));
      setWaterLevel(roundedLevel + 250);
      onWaterLevelChange((roundedLevel + 250)/1000);
    });

    return () => {
      socket.off("initial_data");
      socket.off("new_data");
    };
  }, [onWaterLevelChange]);

  return (
    <div className="water-level">
      <div className="water-level-title">
        <div className="warning-icon">
          <svg width="80" height="72" viewBox="0 0 80 72">
            <path d="M35.5,7 C37.5,3 42.5,3 44.5,7 L74,63 C76,67 74,71 70,71 L10,71 C6,71 4,67 6,63 Z" fill="#000"/>
            <text x="40" y="62" textAnchor="middle" fill="#ffffff" fontSize="50" fontWeight="bold">!</text>
          </svg>
        </div>
        <div className="warning-text">
          <span>침수</span>
          <span>위험</span>
        </div>
      </div>
      <p>현재 수위</p>
      <div>
        <span>{waterLevel}</span>
        <span>mm</span>
      </div>
    </div>
  );
}

export default WaterLevel;