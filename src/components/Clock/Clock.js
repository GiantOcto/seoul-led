import React, { useEffect, useState } from 'react';
import './Clock.css';

function Clock({ clockStyle = 'analog' }) {
  const [time, setTime] = useState(new Date());
  const [date, setDate] = useState('');

  // 마커 생성 함수
  const createMarks = () => {
    const clock = document.querySelector(".clock");
    if (!clock) return;
    
    // 기존 마커 제거
    const existingMarks = clock.querySelectorAll(".marks, .hour-marks");
    existingMarks.forEach(mark => mark.remove());
    
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
    if (clockStyle === 'analog') {
      createMarks();
    }
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now);
      setDate(now.toLocaleDateString('en-CA'));
    }, 1000);

    return () => clearInterval(interval);
  }, [clockStyle]);

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

  const renderAnalogClock = () => {
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
  };

  const renderDigitalClock = () => (
    <div className="digital-clock">
      <div className="time">
        {time.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })}
      </div>
      <div className="date">
        {time.toLocaleDateString('ko-KR', {
          month: 'long',
          day: 'numeric'
        })}
      </div>
    </div>
  );

  return clockStyle === 'digital' ? renderDigitalClock() : renderAnalogClock();
}

export default Clock;