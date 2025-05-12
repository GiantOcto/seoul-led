import React from "react";
import "./Logo.css";

export function Logo1({ id }) {
  return (
    <div className="logo-1" id={id}>
      <img id="logo-seoul" src="/images/서울1.png" alt="Seoul Logo" />
    </div>
  );
}

export function Logo2({ id }) {
  return (
    <div className="logo-2" id={id}>
      <img
        id="logo-donghang"
        src="/images/동행·매력_특별시_서울.png"
        alt="Seoul Logo"
      />
    </div>
  );
}

export function Logo3({ id, selectedDistrict }) {
  return (
    <div className="logo-3" id={id}>
      <img
        id="logo-gangnam"
        src="/images/slogans/강남구.png"
        alt="강남구 slogan"
      />
    </div>
  );
}

export function Logo4({ id, selectedDistrict }) {
  return (
    <div className="logo-4" id={id}>
      <img
        id="logo-gangnamCI"
        src="/images/강남구CI.png"
        alt="강남구 CI"
      />
    </div>
  );
}

// 기본 내보내기는 Logo1으로 유지
export default Logo1;
