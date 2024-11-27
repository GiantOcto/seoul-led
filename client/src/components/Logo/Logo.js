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

// 기본 내보내기는 Logo1으로 유지
export default Logo1;
