import React, { useEffect, useState } from 'react';
import './Clock2.css';

function Clock2() {
  const [time, setTime] = useState(new Date());
  const [date, setDate] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now);
      
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      const formattedDay = days[now.getDay()];
      
      setDate(formattedDate);
      setDayOfWeek(formattedDay);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const second = time.getSeconds();
  const minute = time.getMinutes();
  const hour = time.getHours();

  const secondDeg = second * 6;
  const minuteDeg = minute * 6 + second * 0.1;
  const hourDeg = hour * 30 + minute * 0.5;

  // 시간 숫자 배열
  const hourNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <div className="clock2-container">
      <div className="clock2-date">{date} ({dayOfWeek})</div>
      <div className="clock2">
        {/* 시간 숫자 */}
        {hourNumbers.map((num) => {
          // 각도 계산: 12시는 -90도 (맨 위), 1시는 -60도, 2시는 -30도, ...
          const angle = (num * 30 - 90) * (Math.PI / 180);
          const radius = 38;
          const x = 50 + radius * Math.cos(angle);
          const y = 50 + radius * Math.sin(angle);
          return (
            <div
              key={num}
              className="clock2-hour-number"
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {num}
            </div>
          );
        })}
        
        {/* 분 마커 */}
        {Array.from({ length: 60 }, (_, i) => (
          <div
            key={i}
            className="clock2-minute-mark"
            style={{
              transform: `rotate(${i * 6}deg)`,
            }}
          />
        ))}
        
        {/* 시침, 분침, 초침 */}
        <div className="clock2-hands">
          <div 
            className="clock2-hour" 
            style={{ transform: `rotate(${hourDeg}deg)` }}
          />
          <div 
            className="clock2-minute" 
            style={{ transform: `rotate(${minuteDeg}deg)` }}
          />
          <div 
            className="clock2-second" 
            style={{ transform: `rotate(${secondDeg}deg)` }}
          />
        </div>
        <div className="clock2-center-dot" />
      </div>
    </div>
  );
}

export default Clock2;