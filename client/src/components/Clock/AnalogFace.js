import React, { useId } from "react";
import "./AnalogFace.css";

const TICK_COUNT = 60;
const SECOND_HAND_COLOR = "#f97316";

const THEMES = {
  // 어두운 시계판 + 하늘색 빛 테두리
  dark: { tick: "#e2e8f0", minorTick: "rgba(226, 232, 240, 0.75)", hand: "#ffffff", cap: "#0b1020", hasNumerals: false },
  // 흰 시계판 + 12·3·6·9 숫자
  light: { tick: "#1e3a8a", minorTick: "rgba(30, 58, 138, 0.6)", hand: "#0f172a", cap: "#ffffff", hasNumerals: true },
};

const LIGHT_NUMERALS = [
  ["12", 0, -27],
  ["3", 28, 1],
  ["6", 0, 29],
  ["9", -28, 1],
];

function tickLine(i, theme) {
  const isHour = i % 5 === 0;
  const isQuarter = i % 15 === 0;
  // 눈금은 분침 끝(33) 바깥에서 시작해 분침과 겹치지 않게 (12·3·6·9는 굵기로 구분)
  const inner = isHour ? 39 : 41;
  const width = isQuarter ? 3.2 : isHour ? 2.2 : 1.6;
  return (
    <line
      key={i}
      y1={-inner}
      y2={-44}
      stroke={isHour ? theme.tick : theme.minorTick}
      strokeWidth={width}
      strokeLinecap="round"
      transform={`rotate(${i * 6})`}
    />
  );
}

/** 아날로그 시계판 (variant: "dark" | "light") */
function AnalogFace({ variant = "dark", now, size = 104 }) {
  const gradientId = `analog-face-${useId().replace(/:/g, "")}`;
  const isDark = variant === "dark";
  const theme = THEMES[variant];

  const seconds = now.getSeconds();
  const minutes = now.getMinutes();
  const hours = now.getHours();

  return (
    <svg className="analog-face" width={size} height={size} viewBox="-50 -50 100 100" aria-hidden="true">
      {isDark ? (
        <>
          <defs>
            <radialGradient id={gradientId} cx="50%" cy="38%" r="65%">
              <stop offset="0" stopColor="#22325a" />
              <stop offset="1" stopColor="#070b16" />
            </radialGradient>
          </defs>
          <circle r="48" fill={`url(#${gradientId})`} stroke="#38bdf8" strokeWidth="2.5" />
        </>
      ) : (
        <circle r="48" fill="#ffffff" stroke="#93c5fd" strokeWidth="3" />
      )}

      {Array.from({ length: TICK_COUNT }, (_, i) => tickLine(i, theme))}

      {theme.hasNumerals &&
        LIGHT_NUMERALS.map(([text, x, y]) => (
          <text key={text} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="13" fill={theme.tick} fontFamily="SeoulHangangEB">
            {text}
          </text>
        ))}

      <g transform={`rotate(${(hours % 12) * 30 + minutes * 0.5})`}>
        <line y1="5" y2="-22" stroke={theme.hand} strokeWidth="5" strokeLinecap="round" />
      </g>
      <g transform={`rotate(${minutes * 6 + seconds * 0.1})`}>
        <line y1="6" y2="-33" stroke={theme.hand} strokeWidth="3.2" strokeLinecap="round" />
      </g>
      <g transform={`rotate(${seconds * 6})`}>
        <line y1="10" y2="-38" stroke={SECOND_HAND_COLOR} strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <circle r="4" fill={SECOND_HAND_COLOR} />
      <circle r="1.6" fill={theme.cap} />
    </svg>
  );
}

export default AnalogFace;
