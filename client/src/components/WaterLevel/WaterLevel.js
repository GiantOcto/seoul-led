import { useEffect, useState } from "react";
import io from "socket.io-client";
import "./WaterLevel.css";

const socket = io("http://localhost:8000", {
  transports: ["websocket"],
});

function WaterLevel() {
  const [waterLevel, setWaterLevel] = useState(0);

  useEffect(() => {
    // 초기 데이터 수신
    socket.on("initial_data", (data) => {
      if (data && data.length > 0) {
        setWaterLevel(data[data.length - 1].water_level);
      }
    });

    // 실시간 데이터 수신
    socket.on("new_data", (data) => {
      setWaterLevel(data.water_level);
    });

    // 컴포넌트 언마운트 시 연결 해제
    return () => {
      socket.off("initial_data");
      socket.off("new_data");
    };
  }, []);

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
