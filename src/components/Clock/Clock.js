import React, { useEffect, useState } from 'react';
import './Clock.css';

function Clock() {
  const [time, setTime] = useState(new Date());
  const [date, setDate] = useState('');

  // 마커 생성 함수
  const createMarks = () => {
    const clock = document.querySelector(".clock");
    
    // 분 마커
    const marks = document.createElement("div");
    marks.className = "marks";
    [...Array(60)].forEach((_, i) => {
      const mark = document.createElement("div");
      mark.style.transform = `rotate(${i * 6}deg)`;
      marks.appendChild(mark);
    });
    clock.appendChild(marks);

    // 시간 마커
    const hourMarks = document.createElement("div");
    hourMarks.className = "hour-marks";
    [...Array(12)].forEach((_, i) => {
      const mark = document.createElement("div");
      mark.style.transform = `rotate(${i * 30}deg)`;
      hourMarks.appendChild(mark);
    });
    clock.appendChild(hourMarks);
  };

  useEffect(() => {
    createMarks();
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now);
      setDate(now.toLocaleDateString('en-CA'));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getRotation = () => {
    const second = time.getSeconds();
    const minute = time.getMinutes();
    const hour = time.getHours();

    return {
      second: second * 6,
      minute: minute * 6 + second * 0.1,
      hour: hour * 30 + minute * 0.5
    };
  };

  const { second, minute, hour } = getRotation();

  return (
    <div className="clock-container">
      <div className="clock">
        <div className="hands">
          <div className="hour" style={{ transform: `rotate(${hour}deg)` }} />
          <div className="minute" style={{ transform: `rotate(${minute}deg)` }} />
          <div className="second" style={{ transform: `rotate(${second}deg)` }} />
        </div>
        <div className="center-dot" />
      </div>
      <div className="date">{date}</div>
    </div>
  );
}

export default Clock;