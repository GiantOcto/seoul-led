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
    
    return allEvents
      .filter(event => {
        const startDate = new Date(event.STRTDATE);
        const endDate = new Date(event.ENDDATE);
        
        // 진행 중이거나 오늘 이후 시작하는 행사만
        return (today >= startDate && today <= endDate) || (startDate >= today);
      })
      .sort((a, b) => new Date(a.STRTDATE) - new Date(b.STRTDATE)); // 날짜순 정렬
  };

  // 앱 시작시 + 매일 자정에 체크하여 매달 1일에만 API 호출
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
          setAllEventsData(JSON.parse(cachedData));
          return;
        }

        // 매달 1일이거나 캐시 없거나 만료시에만 API 호출
        console.log("문화행사 API 호출 중... (매달 1일 또는 캐시 만료)");
        
        // 이번 달 전체 데이터 요청
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const formattedDate = `${year}-${month}`;
        
        const response = await fetch(
          `http://openapi.seoul.go.kr:8088/626f624975776c7336385252626b78/json/culturalEventInfo/1/1000/%20/%20/${formattedDate}`
        );
        
        const data = await response.json();
        
        if (!data?.culturalEventInfo?.row) {
          console.error("API 응답 데이터 형식이 올바르지 않습니다:", data);
          return;
        }

        // localStorage에 저장
        localStorage.setItem(CACHE_KEY, JSON.stringify(data.culturalEventInfo.row));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        
        setAllEventsData(data.culturalEventInfo.row);
        console.log(`문화행사 데이터 ${data.culturalEventInfo.row.length}개 로드 완료`);
        
        // 이미지 프리로딩 (백그라운드에서 조용히 실행)
        preloadImages(data.culturalEventInfo.row);
        
      } catch (error) {
        console.error("문화행사 API 호출 실패:", error);
        
        // API 실패시 기존 캐시라도 사용
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          console.log("API 실패, 기존 캐시 사용");
          setAllEventsData(JSON.parse(cachedData));
        }
      }
    };

    fetchAllEvents();
    
    // 매일 자정에 체크하여 매달 1일이면 API 호출
    const checkDaily = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      
      const midnightTimeout = setTimeout(() => {
        fetchAllEvents(); // 자정에 체크
        
        // 매일 자정마다 반복
        const dailyInterval = setInterval(fetchAllEvents, 24 * 60 * 60 * 1000);
        
        // cleanup 함수에서 interval 정리
        return () => clearInterval(dailyInterval);
      }, timeUntilMidnight);
      
      // cleanup 함수에서 timeout 정리
      return () => clearTimeout(midnightTimeout);
    };
    
    const cleanupDaily = checkDaily();
    
    // useEffect cleanup 함수
    return () => {
      if (cleanupDaily) {
        cleanupDaily();
      }
    };
  }, []); // 빈 의존성 배열 = 앱 시작시 1회만

  // selectedDistrict나 position 변경시 필터링만 수행 (API 호출 없음)
  useEffect(() => {
    if (!allEventsData || !selectedDistrict) {
      setEvents([]);
      setCurrentEvent(null);
      return;
    }

    // 1단계: 먼저 구별로 이벤트 분류
    let districtEvents;
    
    if (position === 'middle4' || position === 'bottom4') {
      // 선택된 구의 이벤트들만 추출
      districtEvents = allEventsData.filter(event => event.GUNAME === selectedDistrict);
    } else if (position === 'middle5' || position === 'bottom5') {
      // 선택된 구를 제외한 다른 구의 이벤트들만 추출
      districtEvents = allEventsData.filter(event => event.GUNAME !== selectedDistrict);
    }
    
    // 2단계: 추출된 구의 이벤트들에서 홀수/짝수 인덱스 분할
    let indexFilteredEvents;
    
    if (position === 'middle4' || position === 'middle5') {
      // 홀수 인덱스 (1, 3, 5, ...)
      indexFilteredEvents = districtEvents.filter((event, index) => index % 2 === 1);
    } else if (position === 'bottom4' || position === 'bottom5') {
      // 짝수 인덱스 (0, 2, 4, ...)
      indexFilteredEvents = districtEvents.filter((event, index) => index % 2 === 0);
    }
    
    // 2단계: 인덱스 필터링된 결과에서 날짜 필터링
    const filteredEvents = getUpcomingEvents(indexFilteredEvents);
    
    // 디버깅: 필터링 결과 확인
    console.log(`[${position}] 선택된 구: ${selectedDistrict}`);
    console.log(`[${position}] 필터링된 이벤트 개수: ${filteredEvents ? filteredEvents.length : 0}`);
    console.log(`[${position}] 필터링된 이벤트:`, filteredEvents);
    
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
          src={currentEvent.MAIN_IMG} 
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