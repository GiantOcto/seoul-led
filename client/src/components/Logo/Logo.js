import React from "react";
import "./Logo.css";

// 포항시 슬로건·CI — 로고 칸 126×42 안에 들어가도록 가로 110px (비율 유지)
// 슬로건 "Powerful Pohang" 110×42, CI "pohang" 110×33

export function Logo3({ id, style }) {
  return (
    <div className="logo-3" id={id}>
      <img
        id="logo-slogan"
        src="/images/slogans/포항시.png"
        alt="Powerful Pohang"
        style={style}
      />
    </div>
  );
}

export function Logo4({ id }) {
  return (
    <div className="logo-4" id={id}>
      <img
        id="logo-ci"
        src="/images/포항시CI.png"
        alt="pohang"
      />
    </div>
  );
}
