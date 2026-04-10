import React, { useEffect, useMemo, useState } from 'react';
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
  const [time, setTime] = useState(() => new Date());

  const { date, dayOfWeek } = useMemo(() => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const year = time.getFullYear();
    const month = String(time.getMonth() + 1).padStart(2, '0');
    const day = String(time.getDate()).padStart(2, '0');
    return {
      date: `${year}-${month}-${day}`,
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

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');

  const firstDigit = parseInt(hours[0]);
  const firstMinuteDigit = parseInt(minutes[0]);
  const isCentered = firstDigit === 0 || firstDigit === 2;
  const isMinuteShifted = firstMinuteDigit === 1;
  const isBothOne = firstDigit === 1 && firstMinuteDigit === 1;

  return (
    <div className="digital-clock-container">
      <div className="digital-date">{date} ({dayOfWeek})</div>
      <div className={`digital-time ${isCentered ? 'centered' : ''} ${isBothOne ? 'both-one' : ''}`}>
        <SevenSegmentDigit digit={firstDigit} />
        <SevenSegmentDigit digit={parseInt(hours[1])} />
        <span className="digital-separator"></span>
        <div className={`digital-minutes ${isMinuteShifted ? 'shifted' : ''}`}>
          <SevenSegmentDigit digit={firstMinuteDigit} />
          <SevenSegmentDigit digit={parseInt(minutes[1])} />
        </div>
      </div>
    </div>
  );
}

export default DigitalClock;