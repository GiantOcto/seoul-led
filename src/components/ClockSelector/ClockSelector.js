import React from 'react';
import './ClockSelector.css';

const clockStyles = [
    { label: '아날로그', value: 'analog' },
    { label: '디지털', value: 'digital' },
    { label: '미니멀', value: 'minimal' }
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
          {clockStyles.map((style) => (
            <option key={style.value} value={style.value}>
              {style.label}
            </option>
          ))}
        </select>
      </div>
    );
}

export default ClockSelector; 