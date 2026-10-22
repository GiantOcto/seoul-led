import React, { useState, useEffect, useRef } from 'react';
import './Event.css';

function Event({ selectedDistrict, position }) {
  const [events, setEvents] = useState([]);
  const dailyPreloadDone = useRef(null);
  const PRELOADED_URLS = useRef(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [allEventsData, setAllEventsData] = useState(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  // 캐시 관리 설정
  const CACHE_DURATION = 90 * 24 * 60 * 60 * 1000; // ⭐ 90일 (3개월)
  const CACHE_KEY = 'culturalEvents_cache';
  const CACHE_TIME_KEY = 'culturalEvents_time';
  const MAX_CACHE_AGE = 180 * 24 * 60 * 60 * 1000; // ⭐ 6달 (캐시 최대 보관)

  // 매일 09:00에 4개 이미지만 프리로드
  const dailyPreloadCheck = (eventData) => {
  if (!eventData || eventData.length === 0) return;
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  if (dailyPreloadDone.current === today || now.getHours() < 9) {
    return;
  }
  
  console.log(`⏰ ${today} 09:00 데일리 프리로드 시작!`);
  
  let upcomingEvents = getUpcomingEvents(eventData);
  
  // ⭐ 서초구만 필터링
  let seochoEvents = upcomingEvents
    .filter(e => e.GUNAME === '서초구')
    .slice(0, 2);
  
  // ⭐ 서초구 이벤트 부족시 범위 확장
  if (seochoEvents.length < 2) {
    console.log(`⚠️ 서초구 이벤트 ${seochoEvents.length}개뿐... 범위 확장!`);
    
    // 한달치로 범위 확장
    const today = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    
    seochoEvents = eventData
      .filter(event => {
        const endDate = new Date(event.ENDDATE);
        return event.GUNAME === '서초구' && endDate >= today;
      })
      .sort((a, b) => new Date(a.STRTDATE) - new Date(b.STRTDATE))
      .slice(0, 4);
    
    console.log(`📈 확장 후: 서초구 이벤트 ${seochoEvents.length}개`);
  }
  
  // ⭐ 서초구 제외한 다른 구들
  const others = upcomingEvents
    .filter(e => e.GUNAME !== '서초구')
    .slice(0, 4);
  
  const todayPreload = [...seochoEvents, ...others];
    
      todayPreload.forEach(event => {
      if (event && event.MAIN_IMG) {
        const imgUrl = event.MAIN_IMG;
        
        // ⭐ 중복 체크 추가
        if (!PRELOADED_URLS.current.has(imgUrl)) {
          const img = new Image();
          img.src = imgUrl;
          PRELOADED_URLS.current.add(imgUrl);  // ⭐ Set에 추가
          console.log(`📥 새 이미지 프리로드: ${event.GUNAME} - ${event.TITLE}`);
        } else {
          console.log(`⏭️ 이미 프리로드됨: ${event.TITLE}`);
        }
      }
    });
    
    dailyPreloadDone.current = today;
    console.log(`✅ 데일리 프리로드 완료: ${todayPreload.length}개`);
  };


  // 이미지 프리로딩 함수 (백그라운드에서 조용히 실행)
  /* const preloadImages = async (eventData) => {
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
  }; */

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

  // 오늘부터 가장 가까운 행사들 필터링
  const getUpcomingEvents = (allEvents) => {
    if (!allEvents) return [];
    
    const today = new Date();
    const twoWeeksLater = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);  // ⭐ 7 → 14
    
    return allEvents
      .filter(event => {
        const startDate = new Date(event.STRTDATE);
        const endDate = new Date(event.END_DATE);
        
        // 진행 중이거나 60일 내 시작하는 행사
        return (today >= startDate && today <= endDate) || 
              (startDate >= today && startDate <= twoWeeksLater);
      })
      .sort((a, b) => new Date(a.STRTDATE) - new Date(b.STRTDATE));
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
        
        // 캐시가 있고 90일 이내면 API 호출 안함
        if (cachedData && cachedTime && 
            (Date.now() - parseInt(cachedTime) < CACHE_DURATION)) {
          console.log("localStorage 캐시 사용 중... (API 호출 없음)");
          
          try {
            const parsedData = JSON.parse(cachedData);
            
            // 데이터 유효성 체크
            if (Array.isArray(parsedData) && parsedData.length > 0) {
              setAllEventsData(parsedData);
              return;
            } else {
              console.warn('캐시 데이터 형식 이상함');
              throw new Error('Invalid cache format');
            }
            
          } catch (e) {
            console.error('캐시 사용 실패, 새로 받아옴:', e);
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem(CACHE_TIME_KEY);
            // return 안하고 아래 API 호출 코드로 진행
          }
        }

        // 캐시 없거나 3개월 지났을 때만 API 호출
        console.log("문화행사 API 호출 중... (캐시 만료)");
        
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

        // localStorage 용량 체크 후 저장
        try {
          const dataToStore = JSON.stringify(data.culturalEventInfo.row);
          const sizeInMB = dataToStore.length / (1024 * 1024);
          
          console.log(`📦 저장할 데이터 크기: ${sizeInMB.toFixed(2)}MB`);
          
          if (sizeInMB > 4) { // 4MB 넘으면 위험
            console.warn("⚠️ 데이터 너무 큼, 500개만 저장");
            const reduced = data.culturalEventInfo.row.slice(0, 500);
            localStorage.setItem(CACHE_KEY, JSON.stringify(reduced));
            setAllEventsData(reduced);
          } else {
            localStorage.setItem(CACHE_KEY, dataToStore);
            setAllEventsData(data.culturalEventInfo.row);
          }
          
          localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
          
        } catch (e) {
          if (e.name === 'QuotaExceededError') {
            console.error('💥 localStorage 꽉참! 오래된 데이터 삭제중...');
            // 오래된 캐시들 삭제
            localStorage.removeItem('seoulAirQuality_cache'); // 날씨 캐시
            localStorage.removeItem('seoulAirQuality_time');
            // 재시도
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify(data.culturalEventInfo.row));
              setAllEventsData(data.culturalEventInfo.row);
            } catch (e2) {
              console.error('그래도 안됨, 포기');
              setAllEventsData(data.culturalEventInfo.row);
            }
          }
        }

        // 이미지 프리로딩 (백그라운드에서 조용히 실행)
        // preloadImages(data.culturalEventInfo.row);
        
      } catch (error) {
        console.error("문화행사 API 호출 실패:", error);
        
        // API 실패시 기존 캐시라도 사용
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          console.log("API 실패, 기존 캐시 사용");
          try {
            const parsedCache = JSON.parse(cachedData);
            setAllEventsData(parsedCache);
          } catch (e) {
            console.error('캐시 파싱 실패:', e);
            localStorage.removeItem(CACHE_KEY);
          }
        }
      }
    };

    fetchAllEvents();
  }, []); // 빈 의존성 배열 = 앱 시작시 1회만

    // 매일 09:00 체크 (정확한 시간에 한번만)
  useEffect(() => {
    if (!allEventsData) return;
    
    const scheduleNext9AM = () => {
      const now = new Date();
      const next9AM = new Date();
      next9AM.setHours(9, 0, 0, 0);
      
      // 이미 9시 지났으면 내일 9시로
      if (now.getHours() >= 9) {
        next9AM.setDate(next9AM.getDate() + 1);
      }
      
      const msUntilNext9AM = next9AM - now;
      console.log(`⏰ 다음 프리로드까지 ${Math.floor(msUntilNext9AM / 1000 / 60)}분`);
      
      return setTimeout(() => {
        dailyPreloadCheck(allEventsData);
        scheduleNext9AM(); // 재귀로 다음 9시 예약
      }, msUntilNext9AM);
    };
    
    // 처음 한번 체크
    dailyPreloadCheck(allEventsData);
    
    // 다음 9시 예약
    const timer = scheduleNext9AM();
    
    return () => clearTimeout(timer);
  }, [allEventsData]);


  // selectedDistrict나 position 변경시 필터링만 수행 (API 호출 없음)
  useEffect(() => {
    if (!allEventsData || !selectedDistrict) {
      setEvents([]);
      setCurrentEvent(null);
      return;
    }

    // 1단계: 날짜별 필터링 (오늘부터 가장 가까운 행사들)
    const upcomingEvents = getUpcomingEvents(allEventsData);
    
    // ⭐ 서초구 이벤트 부족시 범위 확장 (LED 표시용)
    let districtEvents = upcomingEvents.filter(e => e.GUNAME === selectedDistrict);
  
    if (selectedDistrict === '서초구' && districtEvents.length < 2) {
    console.log(`⚠️ LED용 서초구 이벤트 ${districtEvents.length}개 → 범위 확장`);
    const today = new Date();
    
    districtEvents = allEventsData
      .filter(event => {
        const endDate = new Date(event.END_DATE);
        return event.GUNAME === '서초구' && endDate >= today;
      })
      .sort((a, b) => new Date(a.STRTDATE) - new Date(b.STRTDATE))
      .slice(0, 4);  // 최대 4개만
    
    console.log(`📈 확장 완료: ${districtEvents.length}개 찾음`);
  } else {
    // 정확히 4개만 가져오기
    districtEvents = districtEvents.slice(0, 4);
  }
    
    // 2단계: position별 필터링
    let filteredEvents;
    
    if (position === 'middle4') {
      // 구 이벤트 4개 중 홀수 인덱스 (1,3) → 2개
      filteredEvents = districtEvents.filter((_, index) => index % 2 === 1);
    } else if (position === 'bottom4') {
      // 구 이벤트 4개 중 짝수 인덱스 (0,2) → 2개
      filteredEvents = districtEvents.filter((_, index) => index % 2 === 0);
    } else if (position === 'middle5') {
      // 전체 이벤트: 서초구 제외한 이벤트 4개 먼저 필터링
      const nonSeochoEvents = upcomingEvents
        .filter(event => event.GUNAME !== selectedDistrict)
        .slice(0, 4);
      // 그 중 짝수 인덱스 (0,2) → 2개
      filteredEvents = nonSeochoEvents.filter((_, index) => index % 2 === 0);
    } else if (position === 'bottom5') {
      // 전체 이벤트: 서초구 제외한 이벤트 4개 먼저 필터링
      const nonSeochoEvents = upcomingEvents
        .filter(event => event.GUNAME !== selectedDistrict)
        .slice(0, 4);
      // 그 중 홀수 인덱스 (1,3) → 2개
      filteredEvents = nonSeochoEvents.filter((_, index) => index % 2 === 1);
    }

    // 프리로드 URL 집합은 데일리 배치용으로만 쓰고, 표시 목록은 필터 결과 전부 사용.
    // (이전: PRELOADED_URLS에 없으면 행사 자체를 숨김 → 9시 전·프리로드 8건 밖 행사가 통째로 누락됨)

    if (filteredEvents && filteredEvents.length > 0) {
      setEvents(filteredEvents);
      setCurrentEvent(filteredEvents[0]);
      setCurrentIndex(0);
      setImageLoadFailed(false);
    } else {
      setEvents([]);
      setCurrentEvent(null);
    }
  }, [selectedDistrict, position, allEventsData]);

  // 이벤트 순환 (15초마다)
  useEffect(() => {
    if (!events || events.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % events.length;
        setCurrentEvent(events[nextIndex]);
        setImageLoadFailed(false);
        return nextIndex;
      });
    }, 15000);

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

  const handleImageError = () => {
    setImageLoadFailed(true);
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
        {currentEvent.MAIN_IMG && !imageLoadFailed ? (
          <img
            src={currentEvent.MAIN_IMG}
            alt={currentEvent.TITLE}
            onError={handleImageError}
            style={{
              maxWidth: '100%',
              maxHeight: '200px',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div className="event-image-fallback" role="img" aria-label="포스터 없음">
            포스터를 불러올 수 없습니다
          </div>
        )}
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