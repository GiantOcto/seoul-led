import React from "react";
import "./ClockPanel.css";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 시계 페이지 공통 패널: 날짜 + 시계 */
function ClockPanel({ now, children }) {
  return (
    <div className="clock-panel">
      <div className="clock-panel-date">
        {now.getMonth() + 1}월 {now.getDate()}일 <em>({WEEKDAYS[now.getDay()]})</em>
      </div>
      {children}
    </div>
  );
}

export default ClockPanel;
