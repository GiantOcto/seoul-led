import React from "react";
import ClockPanel from "./ClockPanel";
import WeatherSummary from "./WeatherSummary";
import { useNow } from "./useNow";
import "./DigitalClock.css";

// 7세그먼트 획 위치 (viewBox 0 0 20 38 기준 [x, y, w, h])
const SEGMENTS = {
  a: [4, 0, 12, 4],
  b: [16, 3, 4, 15],
  c: [16, 20, 4, 15],
  d: [4, 34, 12, 4],
  e: [0, 20, 4, 15],
  f: [0, 3, 4, 15],
  g: [4, 17, 12, 4],
};
const DIGIT_SEGMENTS = ["abcdef", "bc", "abdeg", "abcdg", "bcfg", "acdfg", "acdefg", "abc", "abcdefg", "abcdfg"];

const pad2 = (n) => String(n).padStart(2, "0");

const CELL_WIDTH = 20;
// "1"은 오른쪽 세로획만 켜져서 칸을 다 쓰면 오른쪽으로 쏠려 보이고,
// 세로획이 가로획 자리만큼 짧아 키도 작아 보임 → 획 둘레만 좁게 그리고 세로획을 늘림
// (끝까지 늘리면 둥근 가로획으로 끝나는 다른 숫자보다 길어 보여서 위아래 1.5씩 남김)
const NARROW_ONE = { x: 14, width: 8 };
const ONE_BARS = [
  [16, 1.5, 4, 16.5],
  [16, 20, 4, 16.5],
];

/** 7세그먼트 숫자 하나 — 켜진 획만 그림 (1은 칸 없이 좁게) */
function SegmentDigit({ digit, width, height }) {
  const isOne = digit === 1;
  const viewX = isOne ? NARROW_ONE.x : 0;
  const viewWidth = isOne ? NARROW_ONE.width : CELL_WIDTH;
  const lit = DIGIT_SEGMENTS[digit];
  const rects = isOne
    ? ONE_BARS.map((bar, i) => [`one-${i}`, bar])
    : Object.entries(SEGMENTS).filter(([name]) => lit.includes(name));
  return (
    <svg width={(width * viewWidth) / CELL_WIDTH} height={height} viewBox={`${viewX} 0 ${viewWidth} 38`} aria-hidden="true">
      {rects.map(([key, [x, y, w, h]]) => (
        <rect key={key} x={x} y={y} width={w} height={h} rx="1.6" className="seg-on" />
      ))}
    </svg>
  );
}

/** HH:MM 7세그먼트 한 줄 */
export function SegmentTime({ now, digitWidth = 22, digitHeight = 42 }) {
  const digits = pad2(now.getHours()) + pad2(now.getMinutes());
  const digit = (i) => <SegmentDigit digit={Number(digits[i])} width={digitWidth} height={digitHeight} />;
  return (
    <div className="seg-time">
      {digit(0)}
      {digit(1)}
      <div className="seg-colon" style={{ gap: `${Math.round(digitHeight / 4)}px` }}>
        <i />
        <i />
      </div>
      {digit(2)}
      {digit(3)}
    </div>
  );
}

/** 디지털 시계 페이지 */
function DigitalClock() {
  const now = useNow();
  return (
    <ClockPanel now={now}>
      <SegmentTime now={now} />
      <WeatherSummary />
    </ClockPanel>
  );
}

export default DigitalClock;
