import React, { useState, useEffect } from 'react';
import './Event.css';

function Event({ selectedDistrict }) {
  const [events, setEvents] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentEvent, setCurrentEvent] = useState(null);

  // 이벤트 데이터 가져오기
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const formattedDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        const response = await fetch(
          `http://openapi.seoul.go.kr:8088/626f624975776c7336385252626b78/json/culturalEventInfo/1/300///${formattedDate}`
        );
        const data = await response.json();
        
        // 선택된 구의 이벤트만 필터링
        const filteredEvents = data.culturalEventInfo.row.filter(
          (event) => event.GUNAME === selectedDistrict
        );
        
        setEvents(filteredEvents);
        if (filteredEvents.length > 0) {
          setCurrentEvent(filteredEvents[0]);
        }
      } catch (error) {
        console.error("데이터 가져오기 실패:", error);
      }
    };

    fetchEvents();
  }, [selectedDistrict]); // selectedDistrict가 변경될 때마다 실행

  // 5초마다 이벤트 변경
  useEffect(() => {
    if (events.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % events.length;
        setCurrentEvent(events[nextIndex]);
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [events]);

  // 날짜 포맷팅 함수
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