import { useEffect, useState, useCallback } from "react";
import { waterLevelSocket as socket } from "../../utils/waterLevelSocket";
import "./WaterLevelSensorsPanel.css";

const EMPTY_BITS = () => Array.from({ length: 20 }, () => false);

function applyPayload(data, setMm, setBits, onWaterLevelChange) {
  if (!data || typeof data.water_level !== "number") return;
  const rawMm = data.water_level;
  const rounded = parseFloat(Number(rawMm).toFixed(0));
  const displayMm = rounded + 250;
  setMm(displayMm);
  if (Array.isArray(data.sensor_bits) && data.sensor_bits.length === 20) {
    setBits(data.sensor_bits.map(Boolean));
  } else {
    setBits(EMPTY_BITS());
  }
  if (typeof onWaterLevelChange === "function") {
    onWaterLevelChange(displayMm / 1000);
  }
}

function WaterLevelSensorsPanel({ onWaterLevelChange }) {
  const [mm, setMm] = useState(null);
  const [bits, setBits] = useState(EMPTY_BITS);

  const handleInitial = useCallback(
    (rows) => {
      if (!rows || !rows.length) return;
      applyPayload(rows[rows.length - 1], setMm, setBits, onWaterLevelChange);
    },
    [onWaterLevelChange]
  );

  const handleNew = useCallback(
    (row) => {
      applyPayload(row, setMm, setBits, onWaterLevelChange);
    },
    [onWaterLevelChange]
  );

  useEffect(() => {
    socket.on("initial_data", handleInitial);
    socket.on("new_data", handleNew);
    return () => {
      socket.off("initial_data", handleInitial);
      socket.off("new_data", handleNew);
    };
  }, [handleInitial, handleNew, onWaterLevelChange]);

  return (
    <aside className="wl-sensors-panel" aria-label="수위 센서 상태">
      <div className="wl-sensors-panel__head">수위 · 센서</div>
      <div className="wl-sensors-panel__mm">
        <span className="wl-sensors-panel__mm-value">
          {mm === null ? "—" : mm}
        </span>
        <span className="wl-sensors-panel__mm-unit">mm</span>
      </div>
      <div className="wl-sensors-panel__grid" role="list">
        {bits.map((on, i) => (
          <div
            key={i}
            className={`wl-sensor-cell ${on ? "wl-sensor-cell--on" : ""}`}
            role="listitem"
            title={`센서 ${i + 1}: ${on ? "감지" : "비감지"}`}
          >
            <span className="wl-sensor-cell__dot" aria-hidden />
            <span className="wl-sensor-cell__num">{i + 1}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default WaterLevelSensorsPanel;
