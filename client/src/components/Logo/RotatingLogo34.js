import React from "react";
import { Logo3, Logo4 } from "./Logo";
import { useLogo34Pair } from "./Logo34PairContext";

/**
 * Logo3 ↔ Logo4 전환은 Context(Logo34PairProvider) 한 곳의 15초 타이머만 사용.
 * 부모의 거대 useMemo(sections)가 로고 때문에 재계산되지 않도록 분리.
 */
export default function RotatingLogo34({ style, className = "logo-transition" }) {
  const showLogo3 = useLogo34Pair();

  return showLogo3 ? (
    <div className={className} style={style}>
      <Logo3 />
    </div>
  ) : (
    <div className={className} style={style}>
      <Logo4 />
    </div>
  );
}