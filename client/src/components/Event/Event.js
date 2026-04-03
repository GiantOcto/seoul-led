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

  // 매일 09:00에 성남시 이벤트만 프리로드
  const dailyPreloadCheck = (eventData) => {
  if (!eventData || eventData.length === 0) return;
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  if (dailyPreloadDone.current === today || now.getHours() < 9) {
    return;
  }
  
  let upcomingEvents = getUpcomingEvents(eventData);
  
  // ⭐ 성남시 이벤트만 필터링
  const seongnamEvents = upcomingEvents.filter(e => e.GUNAME === '성남시');
  
  // 성남시 이벤트 전체 프리로드
  const todayPreload = seongnamEvents;
    
      todayPreload.forEach((event, idx) => {
      if (event && event.MAIN_IMG) {
        const imgUrl = event.MAIN_IMG;
        
        // ⭐ 중복 체크 추가
        if (!PRELOADED_URLS.current.has(imgUrl)) {
          const img = new Image();
          img.src = imgUrl;
          PRELOADED_URLS.current.add(imgUrl);  // ⭐ Set에 추가
        }
      }
    });
    
    dailyPreloadDone.current = today;
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

  // 모든 이벤트 반환 (날짜 필터링 없음)
  const getUpcomingEvents = (allEvents) => {
    if (!allEvents) return [];
    return allEvents;
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

        // 캐시 없거나 만료됐을 때만 API 호출
        console.log("문화행사 API 호출 중... (캐시 만료)");

        // 성남시 공공기관 행사정보 API (data.go.kr)
        const SEONGNAM_API_KEY = "hdY4oBjOnFqA%2BJyW%2Bkzoyx0iCeR8iu5iz4L2gHBvK3C%2FzN8ATC5DxGOPBBimYveDh1LXwswQxuLEGQvxeNe1eg%3D%3D";
        const seongnamUrl = `https://api.odcloud.kr/api/15032523/v1/uddi:010f6c96-2188-4373-82b6-a6646ca7d5bd?page=1&perPage=200&serviceKey=${SEONGNAM_API_KEY}`;
        const seongnamRes = await fetch(seongnamUrl);
        const seongnamJson = await seongnamRes.json();

        if (!seongnamJson?.data || seongnamJson.data.length === 0) {
          console.warn("성남시 행사 데이터가 없습니다.");
          const cachedData = localStorage.getItem(CACHE_KEY);
          if (cachedData) {
            try {
              const parsedCache = JSON.parse(cachedData);
              if (Array.isArray(parsedCache) && parsedCache.length > 0) {
                console.log("📦 API 데이터 없어서 기존 캐시 유지");
                setAllEventsData(parsedCache);
              }
            } catch (e) { /* ignore */ }
          }
          return;
        }

        console.log(`✅ 성남시 API 성공: ${seongnamJson.data.length}건`);
        const seongnamEvents = seongnamJson.data.map((item) => ({
          TITLE: item['행사명'] || '',
          HOST_INST_NM: '성남시',
          CATEGORY_NM: item['분류'] || '',
          DATE: item['행사기간'] || '',
          STRTDATE: (item['행사기간'] || '').split('~')[0]?.trim() || '',
          ENDDATE: (item['행사기간'] || '').split('~')[1]?.trim() || '',
          MAIN_IMG: '',
          GUNAME: '성남시',
        }));

        // localStorage 용량 체크 후 저장
        try {
          const dataToStore = JSON.stringify(seongnamEvents);
          const sizeInMB = dataToStore.length / (1024 * 1024);
          
          console.log(`📦 저장할 데이터 크기: ${sizeInMB.toFixed(2)}MB`);
          
          if (sizeInMB > 4) { // 4MB 넘으면 위험
            console.warn("⚠️ 데이터 너무 큼, 500개만 저장");
            const reduced = seongnamEvents.slice(0, 500);
            localStorage.setItem(CACHE_KEY, JSON.stringify(reduced));
            setAllEventsData(reduced);
          } else {
            localStorage.setItem(CACHE_KEY, dataToStore);
            setAllEventsData(seongnamEvents);
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
              localStorage.setItem(CACHE_KEY, JSON.stringify(seongnamEvents));
              setAllEventsData(seongnamEvents);
            } catch (e2) {
              console.error('그래도 안됨, 포기');
              setAllEventsData(seongnamEvents);
            }
          }
        }

        // 이미지 프리로딩 (백그라운드에서 조용히 실행)
        // preloadImages(seongnamEvents);
        
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

    // 모든 이벤트 가져오기
    const upcomingEvents = getUpcomingEvents(allEventsData);
    
    // 지역별 필터링
    let districtEvents = upcomingEvents.filter(e => e.GUNAME === selectedDistrict);
    
    // 2단계: position별 필터링
    let filteredEvents;
    
    if (position === 'middle4') {
      filteredEvents = districtEvents.filter((_, index) => index % 2 === 1);
    } else if (position === 'bottom4') {
      filteredEvents = districtEvents.filter((_, index) => index % 2 === 0);
    } else if (position === 'middle5') {
      filteredEvents = upcomingEvents.filter(
        (event, index) => event.GUNAME !== selectedDistrict && index % 2 === 1
      );
    } else if (position === 'bottom5') {
      filteredEvents = upcomingEvents.filter(
        (event, index) => event.GUNAME !== selectedDistrict && index % 2 === 0
      );
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

  // 이벤트 순환 (5초마다)
  useEffect(() => {
    if (!events || events.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % events.length;
        setCurrentEvent(events[nextIndex]);
        setImageLoadFailed(false);
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