import React from 'react';
import './ClockSelector.css';

const Clockstyle = [
    '아날로그',
    '디지털',
    '미니멀'
  ];

function ClockSelector({ selectedClockStyle, onClockstyleChange }) {
    return (
      <div className="ClockSelector">
        <h1>시계 스타일 선택</h1>
        <select 
          id="ClockstyleSelect"
          value={selectedClockStyle}
          onChange={(e) => onClockstyleChange(e.target.value)}
        >
          {Clockstyle.map((Clockstyle) => (
            <option key={Clockstyle} value={Clockstyle}>
              {Clockstyle}
            </option>
          ))}
        </select>
      </div>
    );
  }

export default ClockSelector; 