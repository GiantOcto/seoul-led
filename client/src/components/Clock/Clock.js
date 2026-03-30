import React, { useEffect, useMemo, useState } from 'react';
import './Clock.css';

function Clock() {
  const [time, setTime] = useState(() => new Date());

  const { date, dayOfWeek } = useMemo(() => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return {
      date: time.toLocaleDateString('en-CA'),
      dayOfWeek: days[time.getDay()],
    };
  }, [time]);

  useEffect(() => {
    let intervalId = null;

    const tick = () => setTime(new Date());

    const start = () => {
      tick();
      intervalId = setInterval(tick, 1000);
    };

    const stop = () => {
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
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
      <div className="date">{date} ({dayOfWeek})</div>
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