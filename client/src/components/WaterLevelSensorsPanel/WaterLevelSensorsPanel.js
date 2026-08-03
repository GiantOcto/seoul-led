import { useEffect, useState, useCallback } from "react";

import { waterLevelSocket as socket } from "../../utils/waterLevelSocket";

import "./WaterLevelSensorsPanel.css";



const SENSOR_COUNT = 10;
const SENSOR_MM_STEP = 100;



const PLC_STATUS_LABEL = {

  0: "PLC OFF",

  1: "정상",

  2: "에러",

};



function emptyBits(count) {

  return Array.from({ length: count }, () => false);

}



function getRawMm(data) {
  const raw = Number(data.water_level);
  if (!Number.isFinite(raw)) return null;
  return parseFloat(raw.toFixed(0));
}

function isSensorActiveByLevel(mm, index) {
  if (mm == null || !Number.isFinite(mm)) return false;
  return mm >= (index + 1) * SENSOR_MM_STEP;
}

function getSensorCellClass(plcStatus, isError, mm, index) {
  // PLC OFF(0)만 전부 회색 — 에러(2)여도 D1003 비트·수위등 표시
  if (plcStatus === 0 || plcStatus == null) return "";
  if (isError) return "wl-sensor-cell--error";
  if (isSensorActiveByLevel(mm, index)) return "wl-sensor-cell--on";
  return "";
}

function getSensorTitle(plcStatus, isError, mm, index) {
  const n = index + 1;
  const threshold = n * SENSOR_MM_STEP;
  if (plcStatus == null) return `센서 ${n}: —`;
  if (plcStatus === 0) return `센서 ${n}: OFF`;
  if (isError) return `센서 ${n}: 에러`;
  if (isSensorActiveByLevel(mm, index)) return `센서 ${n}: ${threshold}mm 도달`;
  return `센서 ${n}: 미도달`;
}

function applyPayload(data, setMm, setBits, setPlcStatus, setD1004) {
  if (!data || data.source !== "modbus" || typeof data.water_level !== "number") return;

  const rawMm = getRawMm(data);

  setMm(rawMm);



  const plcStatus = Number.isInteger(data.error_code) ? data.error_code : 0;

  setPlcStatus(plcStatus);



  if (Array.isArray(data.sensor_error_bits)) {

    setBits(data.sensor_error_bits.slice(0, SENSOR_COUNT).map(Boolean));

  } else {

    setBits(emptyBits(SENSOR_COUNT));

  }

  // D1004 가동 신호 (1=ON, 0=OFF, 그 외=미수신)
  setD1004(data.d1004_state === 0 || data.d1004_state === 1 ? data.d1004_state : null);

}



function WaterLevelSensorsPanel() {

  const [mm, setMm] = useState(null);

  const [bits, setBits] = useState(() => emptyBits(SENSOR_COUNT));

  const [plcStatus, setPlcStatus] = useState(null);

  const [d1004, setD1004] = useState(null);



  const handleInitial = useCallback(

    (rows) => {

      if (!rows || !rows.length) return;

      applyPayload(rows[rows.length - 1], setMm, setBits, setPlcStatus, setD1004);

    },

    []

  );



  const handleNew = useCallback(

    (row) => {

      applyPayload(row, setMm, setBits, setPlcStatus, setD1004);

    },

    []

  );



  useEffect(() => {

    socket.on("initial_data", handleInitial);

    socket.on("new_data", handleNew);

    return () => {

      socket.off("initial_data", handleInitial);

      socket.off("new_data", handleNew);

    };

  }, [handleInitial, handleNew]);



  return (

    <aside className="wl-sensors-panel" aria-label="수위 센서 상태">

      <div className="wl-sensors-panel__head">수위 · 센서</div>

      <div className="wl-sensors-panel__mm">

        <span className="wl-sensors-panel__mm-value">

          {mm === null ? "—" : mm}

        </span>

        <span className="wl-sensors-panel__mm-unit">mm</span>

      </div>

      {plcStatus !== null && (

        <div

          className={`wl-sensors-panel__plc-status wl-sensors-panel__plc-status--${plcStatus}`}

          role="status"

        >

          {PLC_STATUS_LABEL[plcStatus] ?? `코드 ${plcStatus}`}

        </div>

      )}

      <div className="wl-sensors-panel__grid" role="list">

        {bits.map((isError, i) => (
          <div
            key={i}
            className={`wl-sensor-cell ${getSensorCellClass(plcStatus, isError, mm, i)}`}
            role="listitem"
            title={getSensorTitle(plcStatus, isError, mm, i)}
          >

            <span className="wl-sensor-cell__dot" aria-hidden />

            <span className="wl-sensor-cell__num">{i + 1}</span>

          </div>

        ))}

      </div>

      <div className="wl-sensors-panel__divider" aria-hidden />

      <div className="wl-sensors-panel__d1004-title">압출공기 배출장치 동작유무</div>

      <div

        className={`wl-sensors-panel__d1004 ${d1004 === 1 ? "wl-sensors-panel__d1004--on" : ""} ${d1004 === null ? "wl-sensors-panel__d1004--none" : ""}`}

        role="status"

        title={`D1004 동작 신호: ${d1004 === null ? "미수신" : d1004 === 1 ? "ON" : "OFF"}`}

      >

        <span>{d1004 === null ? "신호 없음" : d1004 === 1 ? "동작 감지" : "배출완료"}</span>

      </div>

    </aside>

  );

}



export default WaterLevelSensorsPanel;

