import { useEffect, useState } from "react";
import io from "socket.io-client";
import "./WaterLevel.css";

const socket = io("http://localhost:8000", {
  transports: ["websocket"],
});

function WaterLevel({ onWaterLevelChange }) {
  const [waterLevel, setWaterLevel] = useState(0);

  useEffect(() => {
    // 초기 데이터 수신
    socket.on("initial_data", (data) => {
      if (data && data.length > 0) {
        const level = data[data.length - 1].water_level / 1000; // mm to m
        const roundedLevel = parseFloat(level.toFixed(2)); // 소수점 둘째 자리 반올림
        setWaterLevel(roundedLevel);
        onWaterLevelChange(roundedLevel);
      }
    });

    // 실시간 데이터 수신
    socket.on("new_data", (data) => {
      const level = data.water_level / 1000; // mm to m
      const roundedLevel = parseFloat(level.toFixed(2)); // 소수점 둘째 자리 반올림
      setWaterLevel(roundedLevel);
      onWaterLevelChange(roundedLevel);
    });

    return () => {
      socket.off("initial_data");
      socket.off("new_data");
    };
  }, [onWaterLevelChange]);

  return (
    <div className="water-level">
      <img src="/images/침수위험.png" alt="water-level" />
      <p>현재 수위</p>
      <div>
        <span>{waterLevel}</span>
        <span>m</span>
      </div>
    </div>
  );
}

export default WaterLevel;
