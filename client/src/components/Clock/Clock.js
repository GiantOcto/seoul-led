import React, { useEffect, useState } from 'react';
import './Clock.css';

function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date);
    return `${year}-${month}-${day}(${weekday})`;
  };

  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = String(hours % 12 || 12).padStart(2, '0');
    return `${ampm} ${displayHours}:${minutes}`;
  };

  return (
    <div className="clock-container">
      <div className="digital-clock">
        <div className="date">{formatDate(time)}</div>
        <div className="time">{formatTime(time)}</div>
      </div>
    </div>
  );
}

export default Clock;