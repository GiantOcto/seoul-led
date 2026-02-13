import React from "react";
import "./Logo.css";

export function Logo1({ id }) {
  return (
    <div className="logo-1" id={id}>
      <img id="logo-seoul" 
      src="/images/서초구CI.png"
       alt="Seoul Logo" 
       />
    </div>
  );
}

export function Logo2({ id }) {
  return (
    <div className="logo-2" id={id}>
      <img
        id="logo-donghang"
        src="/images/서초구CI.png"
        alt="Seoul Logo"
      />
    </div>
  );
}

export function Logo3({ id }) {
  return (
    <div className="logo-3" id={id}>
      <img
        id="logo-gangnam"
        src="/images/slogans/서초구.png"
        alt="서초구 slogan"
      />
    </div>
  );
}

export function Logo4({ id }) {
  return (
    <div className="logo-4" id={id}>
      <img
        id="logo-gangnamCI"
        src="/images/slogans/서초구_세로형.png"
        alt="서초구 CI"
      />
    </div>
  );
}

// 기본 내보내기는 Logo1으로 유지
export default Logo1;
