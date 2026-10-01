import React, { useEffect, useState } from "react";
import { socket } from "../../utils/socket";
import "./Stink.css";

const FAN_BLADE = "M3 -7 C 2 -30 22 -46 38 -36 C 46 -30 34 -10 3 -7 Z";

function SmileIcon() {
  return (
    <svg className="stink-icon" width="68" height="68" viewBox="-50 -50 100 100" aria-hidden="true">
      <circle r="42" fill="#fff" />
      <circle cx="-15" cy="-10" r="7" fill="#1d4ed8" />
      <circle cx="15" cy="-10" r="7" fill="#1d4ed8" />
      <path d="M-22 10 Q0 34 22 10" fill="none" stroke="#1d4ed8" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function FanIcon() {
  return (
    <svg className="stink-icon" width="72" height="72" viewBox="-50 -50 100 100" fill="#fff" aria-hidden="true">
      <circle r="9" />
      {[0, 90, 180, 270].map((deg) => (
        <path key={deg} d={FAN_BLADE} transform={`rotate(${deg})`} />
      ))}
    </svg>
  );
}

function Stink({ id }) {
  const [isReducing, setIsReducing] = useState(false);

  useEffect(() => {
    socket.on("relay_reduction_status", (data) => {
      setIsReducing(Boolean(data?.reducing));
    });

    return () => {
      socket.off("relay_reduction_status");
    };
  }, []);

  return (
    <div id={id} className={`stink ${isReducing ? "stink--busy" : "stink--clean"}`}>
      {isReducing ? <FanIcon /> : <SmileIcon />}
      <div className="stink-state">{isReducing ? "저감중" : "쾌적"}</div>
      {!isReducing && (
        <svg className="stink-wave" viewBox="0 0 232 26" preserveAspectRatio="none" fill="#fff" aria-hidden="true">
          <path d="M0 12 Q 29 0 58 12 T 116 12 T 174 12 T 232 12 V26 H0Z" />
        </svg>
      )}
    </div>
  );
}

export default Stink;
