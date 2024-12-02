import React, { useEffect, useState } from 'react';
import './Clock.css';

function Clock() {
  const [time, setTime] = useState(new Date());
  const [date, setDate] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now);
      
      const formattedDate = now.toLocaleDateString('en-CA');
      setDate(formattedDate);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const second = time.getSeconds();
  const minute = time.getMinutes();
  const hour = time.getHours();

  const secondDeg = second * 6;
  const minuteDeg = minute * 6 + second * 0.1;
  const hourDeg = hour * 30 + minute * 0.5;

  // JSX로 마커 생성
  const minuteMarks = Array.from({ length: 60 }, (_, i) => (
    <div key={i} style={{ transform: `rotate(${i * 6}deg)` }} className="mark"></div>
  ));

  const hourMarks = Array.from({ length: 12 }, (_, i) => (
    <div key={i} style={{ transform: `rotate(${i * 30}deg)` }} className="hour-mark"></div>
  ));

  return (
    <div className="clock-container">
       <div className="date">{date}</div>
      <div className="clock">
        <div className="marks">{minuteMarks}</div>
        <div className="hour-marks">{hourMarks}</div>
        <div className="hands">
          <div 
            className="hour" 
            style={{ transform: `rotate(${hourDeg}deg)` }}
          ></div>
          <div 
            className="minute" 
            style={{ transform: `rotate(${minuteDeg}deg)` }}
          ></div>
          <div 
            className="second" 
            style={{ transform: `rotate(${secondDeg}deg)` }}
          ></div>
        </div>
        <div className="center-dot"></div>
      </div>
    </div>
  );
}

export default Clock;