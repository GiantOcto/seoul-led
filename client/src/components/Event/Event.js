import React, { useState, useEffect } from 'react';
import './Event.css';

function Event({ selectedDistrict, position }) {
  const [events, setEvents] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentEvent, setCurrentEvent] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const formattedDate = new Date().toLocaleDateString('en-CA');
        const response = await fetch(
          `http://openapi.seoul.go.kr:8088/626f624975776c7336385252626b78/json/culturalEventInfo/1/300///${formattedDate}`
        );
        const data = await response.json();
        
        if (!data?.culturalEventInfo?.row) {
          console.error("API 응답 데이터 형식이 올바르지 않습니다:", data);
          return;
        }

        let filteredEvents;
        if (position === 'middle4') {
          // 선택된 구의 홀수 인덱스 이벤트
          filteredEvents = data.culturalEventInfo.row.filter(
            (event, index) => event.GUNAME === selectedDistrict && index % 2 === 1
          );
        } else if (position === 'bottom4') {
          // 선택된 구의 짝수 인덱스 이벤트
          filteredEvents = data.culturalEventInfo.row.filter(
            (event, index) => event.GUNAME === selectedDistrict && index % 2 === 0
          );
        } else if (position === 'middle5') {
          // 선택된 구를 제외한 다른 구의 홀수 인덱스 이벤트
          filteredEvents = data.culturalEventInfo.row.filter(
            (event, index) => event.GUNAME !== selectedDistrict && index % 2 === 1
          );
        } else if (position === 'bottom5') {
          // 선택된 구를 제외한 다른 구의 짝수 인덱스 이벤트
          filteredEvents = data.culturalEventInfo.row.filter(
            (event, index) => event.GUNAME !== selectedDistrict && index % 2 === 0
          );
        }
        
        if (filteredEvents && filteredEvents.length > 0) {
          setEvents(filteredEvents);
          setCurrentEvent(filteredEvents[0]);
        }
      } catch (error) {
        console.error("데이터 가져오기 실패:", error);
      }
    };

    fetchEvents();
  }, [selectedDistrict, position]);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % events.length;
        setCurrentEvent(events[nextIndex]);
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [events]);

  const formatDate = (dateString) => {
    const [startDate, endDate] = dateString.split("~");
    return (
      <>
        {startDate}
        {endDate && (
          <>
            <br />
            {endDate}
          </>
        )}
      </>
    );
  };

  if (!currentEvent) {
    return <div className="event-container">해당 구의 이벤트가 없습니다.</div>;
  }

  return (
    <div className="event-container">
      <div className="event-image">
        <img src={currentEvent.MAIN_IMG} alt={currentEvent.TITLE} />
      </div>
      <div className="event-desc">
        <div className="event-title">
          <p>{currentEvent.TITLE}</p>
        </div>
        <div className="event-date">
          <p>{formatDate(currentEvent.DATE)}</p>
        </div>
      </div>
    </div>
  );
}

export default Event;