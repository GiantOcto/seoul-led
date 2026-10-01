import React from "react";
import "./Logo.css";

export function Logo3({ id, style }) {
  return (
    <div className="logo-3" id={id}>
      <img
        id="logo-gangnam"
        src="/images/slogans/성남시.png"
        alt="성남시 slogan"
        style={style}
      />
    </div>
  );
}

export function Logo4({ id }) {
  return (
    <div className="logo-4" id={id}>
      <img
        id="logo-gangnamCI"
        src="/images/성남시CI.png"
        alt="성남시 CI"
      />
    </div>
  );
}
