import React, { useEffect, useState } from 'react';
import './DigitalClock.css';

// 7세그먼트 디스플레이 숫자 컴포넌트
const SevenSegmentDigit = ({ digit }) => {
  const segments = {
    0: ['a', 'b', 'c', 'd', 'e', 'f'],
    1: ['b', 'c'],
    2: ['a', 'b', 'd', 'e', 'g'],
    3: ['a', 'b', 'c', 'd', 'g'],
    4: ['b', 'c', 'f', 'g'],
    5: ['a', 'c', 'd', 'f', 'g'],
    6: ['a', 'c', 'd', 'e', 'f', 'g'],
    7: ['a', 'b', 'c'],
    8: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    9: ['a', 'b', 'c', 'd', 'f', 'g'],
  };

  const activeSegments = segments[digit] || [];

  return (
    <div className="seven-segment">
      <div className={`segment segment-a ${activeSegments.includes('a') ? 'active' : ''}`}></div>
      <div className={`segment segment-b ${activeSegments.includes('b') ? 'active' : ''}`}></div>
      <div className={`segment segment-c ${activeSegments.includes('c') ? 'active' : ''}`}></div>
      <div className={`segment segment-d ${activeSegments.includes('d') ? 'active' : ''}`}></div>
      <div className={`segment segment-e ${activeSegments.includes('e') ? 'active' : ''}`}></div>
      <div className={`segment segment-f ${activeSegments.includes('f') ? 'active' : ''}`}></div>
      <div className={`segment segment-g ${activeSegments.includes('g') ? 'active' : ''}`}></div>
    </div>
  );
};

function DigitalClock() {
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

  // 캡처용: 12시 30분으로 고정
  const hours = '12'; // String(time.getHours()).padStart(2, '0');
  const minutes = '30'; // String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');

  const firstDigit = parseInt(hours[0]);
  const isCentered = firstDigit === 0 || firstDigit === 2;

  return (
    <div className="digital-clock-container">
      <div className="digital-date">{date} ({dayOfWeek})</div>
      <div className={`digital-time ${isCentered ? 'centered' : ''}`}>
        <SevenSegmentDigit digit={firstDigit} />
        <SevenSegmentDigit digit={parseInt(hours[1])} />
        <span className="digital-separator"></span>
        <SevenSegmentDigit digit={parseInt(minutes[0])} />
        <SevenSegmentDigit digit={parseInt(minutes[1])} />
      </div>
    </div>
  );
}

export default DigitalClock;
