import React, { useState, useEffect } from 'react';
import './Event.css';

function Event({ selectedDistrict, position }) {
  const [events, setEvents] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [allEventsData, setAllEventsData] = useState(null);

  // 캐시 관리 설정
  const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30일
  const CACHE_KEY = 'culturalEvents_cache';
  const CACHE_TIME_KEY = 'culturalEvents_time';
  const MAX_CACHE_AGE = 90 * 24 * 60 * 60 * 1000; // 3달

  // 이미지 프리로딩 함수 (백그라운드에서 조용히 실행)
  const preloadImages = async (eventData) => {
    if (!eventData || eventData.length === 0) return;

    // 중복 제거하고 유효한 이미지 URL만 추출
    const imageUrls = [...new Set(
      eventData
        .map(event => event.MAIN_IMG)
        .filter(url => url && url.startsWith('http'))
    )];

    console.log(`${imageUrls.length}개 이미지 백그라운드 프리로딩 시작...`);

    // 백그라운드에서 조용히 이미지 로드
    imageUrls.forEach(url => {
      const img = new Image();
      img.onload = () => {
        // 성공시 아무것도 안함 (조용히 캐시됨)
      };
      img.onerror = () => {
        // 실패시 아무것도 안함 (조용히 무시)
      };
      img.src = url;
    });

    console.log(`✅ 이미지 프리로딩 백그라운드 시작 완료`);
  };

  // 3달 지난 캐시 자동 삭제
  const cleanOldCache = () => {
    try {
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
      if (cachedTime && (Date.now() - parseInt(cachedTime) > MAX_CACHE_AGE)) {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIME_KEY);
        console.log("3달 지난 캐시 삭제됨");
      }
    } catch (error) {
      console.error("캐시 정리 오류:", error);
    }
  };

  // 매달 1일인지 확인
  const isFirstDayOfMonth = () => {
    const today = new Date();
    return today.getDate() === 1;
  };

  // 오늘부터 가장 가까운 행사들 필터링
  const getUpcomingEvents = (allEvents) => {
    if (!allEvents) return [];
    
    const today = new Date();
    const oneWeekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return allEvents
      .filter(event => {
        const startDate = new Date(event.STRTDATE);
        const endDate = new Date(event.ENDDATE);
        
        // 진행 중이거나 일주일 내 시작하는 행사
        return (today >= startDate && today <= endDate) || 
               (startDate >= today && startDate <= oneWeekLater);
      })
      .sort((a, b) => new Date(a.STRTDATE) - new Date(b.STRTDATE)); // 날짜순 정렬
  };

  // 앱 시작시 한 번만 전체 데이터 호출 (매달 1일에만 API 호출)
  useEffect(() => {
    const fetchAllEvents = async () => {
      // 3달 지난 캐시 정리
      cleanOldCache();

      try {
        // localStorage에서 캐시 확인
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
        
        // 캐시가 있고 30일 이내이고 매달 1일이 아니면 API 호출 안함
        if (cachedData && cachedTime && 
            (Date.now() - parseInt(cachedTime) < CACHE_DURATION) && 
            !isFirstDayOfMonth()) {
          console.log("localStorage 캐시 사용 중... (API 호출 없음)");
          const parsedData = JSON.parse(cachedData);

          // ⭐⭐⭐ 캐시된 데이터에 LOCAL_IMG가 있는지 확인
          const hasLocalImages = parsedData.some(event => event.LOCAL_IMG);
          
          if (hasLocalImages) {
            console.log("✅ 로컬 이미지 캐시 확인됨!");
          } else {
            console.log("⚠️ 로컬 이미지 없음 - 오프라인시 이미지 안보일 수 있음");
          }
          
          setAllEventsData(parsedData);
          return;
        }

        // 매달 1일이거나 캐시 없거나 만료시에만 API 호출
        console.log("문화행사 API 호출 중... (매달 1일 또는 캐시 만료)");
        
        // 이번 달 전체 데이터 요청
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const formattedDate = startOfMonth.toLocaleDateString('en-CA');
        
        const response = await fetch(
          `http://openapi.seoul.go.kr:8088/626f624975776c7336385252626b78/json/culturalEventInfo/1/1000///${formattedDate}`
        );
        
        const data = await response.json();
        
        if (!data?.culturalEventInfo?.row) {
          console.error("API 응답 데이터 형식이 올바르지 않습니다:", data);
          return;
        }

        // localStorage에 저장
        localStorage.setItem(CACHE_KEY, JSON.stringify(data.culturalEventInfo.row));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        
        // ⭐⭐⭐ 서버로 이미지 다운로드 요청 (추가!)
        try {
          const response = await fetch('http://localhost:8000/api/process-cultural-events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: data.culturalEventInfo.row })
          });
          
          if (response.ok) {
            const processed = await response.json();
            console.log(`✅ 서버에서 이미지 ${processed.processed}개 처리 완료`);
            
            // 서버에서 처리된 데이터 사용 (LOCAL_IMG 포함)
            setAllEventsData(processed.events);
            
            // localStorage도 업데이트
            localStorage.setItem(CACHE_KEY, JSON.stringify(processed.events));
          } else {
            // 서버 처리 실패시 원본 데이터 사용
            setAllEventsData(data.culturalEventInfo.row);
          }
        } catch (err) {
          console.error('서버 이미지 처리 실패:', err);
          setAllEventsData(data.culturalEventInfo.row);
        }

        // 이미지 프리로딩 (백그라운드에서 조용히 실행)
        preloadImages(data.culturalEventInfo.row);
        
      } catch (error) {
        console.error("문화행사 API 호출 실패:", error);
        
        // API 실패시 기존 캐시라도 사용
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          console.log("API 실패, 기존 캐시 사용");
          const parsedCache = JSON.parse(cachedData);
          
          // ⭐⭐⭐ 서버로 이미지 처리 시도 (API는 실패했어도 서버는 살아있을 수 있음)
          try {
            const response = await fetch('http://localhost:8000/api/process-cultural-events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ events: parsedCache })
            });
            
            if (response.ok) {
              const processed = await response.json();
              setAllEventsData(processed.events);
              localStorage.setItem(CACHE_KEY, JSON.stringify(processed.events));
            } else {
              setAllEventsData(parsedCache);
            }
          } catch {
            setAllEventsData(parsedCache);
          }
        }
      }
    };

    fetchAllEvents();
  }, []); // 빈 의존성 배열 = 앱 시작시 1회만

  // selectedDistrict나 position 변경시 필터링만 수행 (API 호출 없음)
  useEffect(() => {
    if (!allEventsData || !selectedDistrict) {
      setEvents([]);
      setCurrentEvent(null);
      return;
    }

    // 1단계: 날짜별 필터링 (오늘부터 가장 가까운 행사들)
    const upcomingEvents = getUpcomingEvents(allEventsData);
    
    // 2단계: position별 필터링
    let filteredEvents;
    
    if (position === 'middle4') {
      // 선택된 구의 홀수 인덱스 이벤트
      filteredEvents = upcomingEvents.filter(
        (event, index) => event.GUNAME === selectedDistrict && index % 2 === 1
      );
    } else if (position === 'bottom4') {
      // 선택된 구의 짝수 인덱스 이벤트
      filteredEvents = upcomingEvents.filter(
        (event, index) => event.GUNAME === selectedDistrict && index % 2 === 0
      );
    } else if (position === 'middle5') {
      // 선택된 구를 제외한 다른 구의 홀수 인덱스 이벤트
      filteredEvents = upcomingEvents.filter(
        (event, index) => event.GUNAME !== selectedDistrict && index % 2 === 1
      );
    } else if (position === 'bottom5') {
      // 선택된 구를 제외한 다른 구의 짝수 인덱스 이벤트
      filteredEvents = upcomingEvents.filter(
        (event, index) => event.GUNAME !== selectedDistrict && index % 2 === 0
      );
    }
    
    if (filteredEvents && filteredEvents.length > 0) {
      setEvents(filteredEvents);
      setCurrentEvent(filteredEvents[0]);
      setCurrentIndex(0);
    } else {
      setEvents([]);
      setCurrentEvent(null);
    }
  }, [selectedDistrict, position, allEventsData]);

  // 이벤트 순환 (5초마다)
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

  // 이미지 로딩 실패시 조용히 처리
  const handleImageError = (e) => {
    e.target.style.display = 'none';  // 이미지만 숨기고 조용히 처리
  };

  // 로딩 상태 표시
  if (!allEventsData) {
    return (
      <div className="event-container">
        문화행사 데이터 로딩 중...
      </div>
    );
  }

  if (!currentEvent) {
    return (
      <div className="event-container">
        해당 지역의 예정된 행사가 없습니다.
      </div>
    );
  }

  return (
    <div className="event-container">
      <div className="event-image">
        <img 
          src={currentEvent.LOCAL_IMG || currentEvent.MAIN_IMG}  // ⭐ 로컬 우선!
          alt={currentEvent.TITLE}
          onError={handleImageError}
          style={{
            maxWidth: '100%',
            maxHeight: '200px',
            objectFit: 'cover'
          }}
        />
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