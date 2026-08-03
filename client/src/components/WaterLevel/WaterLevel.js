import { useEffect, useState } from "react";
import { getLedDisplayMm } from "../../utils/waterLevelDisplay";
import { waterLevelSocket as socket } from "../../utils/waterLevelSocket";
import "./WaterLevel.css";

function WaterLevel({ onWaterLevelChange }) {
  const [waterLevel, setWaterLevel] = useState(0);

  useEffect(() => {
    const apply = (data) => {
      if (!data || typeof data.water_level !== "number") return;
      const displayMm = getLedDisplayMm(data);
      if (displayMm === null) return;
      setWaterLevel(displayMm);
      onWaterLevelChange(displayMm / 1000);
    };

    const onInitial = (rows) => {
      if (rows && rows.length > 0) apply(rows[rows.length - 1]);
    };

    socket.on("initial_data", onInitial);
    socket.on("new_data", apply);

    return () => {
      socket.off("initial_data", onInitial);
      socket.off("new_data", apply);
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