import React from "react";
import ClockPanel from "./ClockPanel";
import AnalogFace from "./AnalogFace";
import { useNow } from "./useNow";

/** 아날로그 시계 페이지 (variant: "dark" = 아날로그, "light" = 아날로그 2) */
function AnalogClock({ variant }) {
  const now = useNow();
  return (
    <ClockPanel now={now}>
      <AnalogFace variant={variant} now={now} />
    </ClockPanel>
  );
}

export default AnalogClock;
