import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Event.css';

const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30일마다 API 재호출
const CACHE_KEY = 'culturalEvents_cache';
const CACHE_TIME_KEY = 'culturalEvents_time';
const MAX_CACHE_AGE = 60 * 24 * 60 * 60 * 1000; // 캐시 최대 보관 60일

let fetchInFlight = null;
let lastDaily9AMDate = null;
let daily9AMSchedulerStarted = false;
const dataListeners = new Set();

function isCacheExpired() {
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
  if (!cachedTime) return true;
  return Date.now() - parseInt(cachedTime, 10) >= CACHE_DURATION;
}

function cleanOldCache() {
  try {
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    if (cachedTime && Date.now() - parseInt(cachedTime, 10) > MAX_CACHE_AGE) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIME_KEY);
      console.log('60일 지난 캐시 삭제됨');
    }
  } catch (error) {
    console.error('캐시 정리 오류:', error);
  }
}

function getUpcomingEvents(allEvents) {
  if (!allEvents) return [];

  const today = new Date();
  const within30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  return allEvents
    .filter((event) => {
      const startDate = new Date(event.STRTDATE);
      const endDate = new Date(event.END_DATE);

      return (
        (today >= startDate && today <= endDate) ||
        (startDate >= today && startDate <= within30Days)
      );
    })
    .sort((a, b) => new Date(a.STRTDATE) - new Date(b.STRTDATE));
}

function saveEventsToCache(rows) {
  const dataToStore = JSON.stringify(rows);
  const sizeInMB = dataToStore.length / (1024 * 1024);

  if (sizeInMB > 4) {
    console.warn('⚠️ 데이터 너무 큼, 500개만 저장');
    const reduced = rows.slice(0, 500);
    localStorage.setItem(CACHE_KEY, JSON.stringify(reduced));
    localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    return reduced;
  }

  localStorage.setItem(CACHE_KEY, dataToStore);
  localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
  return rows;
}

function notifyDataListeners(data) {
  dataListeners.forEach((listener) => listener(data));
}

async function fetchCulturalEvents({ forceRefresh = false } = {}) {
  cleanOldCache();

  if (!forceRefresh && !isCacheExpired()) {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          console.log('localStorage 캐시 사용 중... (API 호출 없음)');
          return parsedData;
        }
      } catch (e) {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIME_KEY);
      }
    }
  }

  if (fetchInFlight) return fetchInFlight;

  fetchInFlight = (async () => {
    console.log('문화행사 API 호출 중... (캐시 만료 또는 강제 갱신)');

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const formattedDate = startOfMonth.toLocaleDateString('en-CA');

    const response = await fetch(
      `http://openapi.seoul.go.kr:8088/626f624975776c7336385252626b78/json/culturalEventInfo/1/1000///${formattedDate}`
    );
    const data = await response.json();

    if (!data?.culturalEventInfo?.row) {
      throw new Error('API 응답 데이터 형식이 올바르지 않습니다.');
    }

    try {
      return saveEventsToCache(data.culturalEventInfo.row);
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        localStorage.removeItem('seoulAirQuality_cache');
        localStorage.removeItem('seoulAirQuality_time');
        return saveEventsToCache(data.culturalEventInfo.row);
      }
      throw e;
    }
  })()
    .catch((error) => {
      console.error('문화행사 API 호출 실패:', error);
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        console.log('API 실패, 기존 캐시 사용');
        return JSON.parse(cachedData);
      }
      return null;
    })
    .finally(() => {
      fetchInFlight = null;
    });

  return fetchInFlight;
}

function msUntilNext9AM() {
  const now = new Date();
  const next9AM = new Date();
  next9AM.setHours(9, 0, 0, 0);
  if (now >= next9AM) {
    next9AM.setDate(next9AM.getDate() + 1);
  }
  return next9AM - now;
}

function Event({ selectedDistrict, position }) {
  const [events, setEvents] = useState([]);
  const dailyPreloadDone = useRef(null);
  const PRELOADED_URLS = useRef(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [allEventsData, setAllEventsData] = useState(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  // 매일 09:00 — 캐시 30일 만료 시 API 갱신 + 이미지 프리로드 (middle4에서만 스케줄)
  const dailyPreloadCheck = (eventData) => {
    if (!eventData || eventData.length === 0) return;
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  if (dailyPreloadDone.current === today || now.getHours() < 9) {
    return;
  }
  
  console.log(`⏰ ${today} 09:00 데일리 프리로드 시작!`);
  
  let upcomingEvents = getUpcomingEvents(eventData);
  
  // ⭐ 구로구만 필터링 (4개)
  let guroEvents = upcomingEvents
    .filter(e => e.GUNAME === '구로구')
    .slice(0, 4);
  
  // ⭐ 구로구 이벤트 부족시 범위 확장
  if (guroEvents.length < 4) {
    console.log(`⚠️ 구로구 이벤트 ${guroEvents.length}개뿐... 범위 확장!`);
    
    // 한달치로 범위 확장
    const today = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    
    guroEvents = eventData
      .filter(event => {
        const endDate = new Date(event.END_DATE);
        return event.GUNAME === '구로구' && endDate >= today;
      })
      .sort((a, b) => new Date(a.STRTDATE) - new Date(b.STRTDATE))
      .slice(0, 4);
    
    console.log(`📈 확장 후: 구로구 이벤트 ${guroEvents.length}개`);
  }
  
  // ⭐ 구로구 제외한 다른 구들 (4개)
  const others = upcomingEvents
    .filter(e => e.GUNAME !== '구로구')
    .slice(0, 4);
  
  const todayPreload = [...guroEvents, ...others];
    
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

  const refreshEventsData = useCallback(async (forceRefresh = false) => {
    const data = await fetchCulturalEvents({ forceRefresh });
    if (data) {
      setAllEventsData(data);
      notifyDataListeners(data);
    }
    return data;
  }, []);

  // 앱 시작 시 데이터 로드 + 다른 Event 슬롯에 갱신 알림
  useEffect(() => {
    refreshEventsData(false);

    const onDataUpdate = (data) => setAllEventsData(data);
    dataListeners.add(onDataUpdate);
    return () => dataListeners.delete(onDataUpdate);
  }, [refreshEventsData]);

  // 매일 09:00 — 캐시 30일 지났으면 API 갱신 후 프리로드 (스케줄러 1개만)
  useEffect(() => {
    if (position !== 'middle4' || daily9AMSchedulerStarted) return undefined;
    daily9AMSchedulerStarted = true;

    const runDaily9AM = async () => {
      const now = new Date();
      if (now.getHours() < 9) return;

      const today = now.toISOString().split('T')[0];
      if (lastDaily9AMDate === today) return;
      lastDaily9AMDate = today;

      const expired = isCacheExpired();
      if (expired) {
        console.log(`⏰ ${today} 09:00 — 캐시 30일 만료, API 갱신`);
      } else {
        console.log(`⏰ ${today} 09:00 — 캐시 유효, 이미지 프리로드만`);
      }

      const data = await refreshEventsData(expired);
      if (data) {
        dailyPreloadCheck(data);
      }
    };

    const scheduleNext9AM = () => {
      const ms = msUntilNext9AM();
      console.log(`⏰ 다음 09:00 체크까지 ${Math.floor(ms / 1000 / 60)}분`);
      setTimeout(async () => {
        await runDaily9AM();
        scheduleNext9AM();
      }, ms);
    };

    runDaily9AM();
    scheduleNext9AM();

    return undefined;
  }, [position, refreshEventsData]);
  // selectedDistrict나 position 변경시 필터링만 수행 (API 호출 없음)
  useEffect(() => {
    if (!allEventsData || !selectedDistrict) {
      setEvents([]);
      setCurrentEvent(null);
      return;
    }

    // 1단계: 날짜별 필터링 (오늘부터 가장 가까운 행사들)
    const upcomingEvents = getUpcomingEvents(allEventsData);
    
    // ⭐ 구로구 이벤트 부족시 범위 확장 (LED 표시용) - 4개 필요
    let districtEvents = upcomingEvents.filter(e => e.GUNAME === selectedDistrict);
  
    if (selectedDistrict === '구로구' && districtEvents.length < 4) {
    console.log(`⚠️ LED용 구로구 이벤트 ${districtEvents.length}개 → 범위 확장`);
    const today = new Date();
    
    districtEvents = allEventsData
      .filter(event => {
        const endDate = new Date(event.END_DATE);
        return event.GUNAME === '구로구' && endDate >= today;
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
      // 전체 이벤트: 구로구 제외한 이벤트 4개 먼저 필터링
      const nonGuroEvents = upcomingEvents
        .filter(event => event.GUNAME !== selectedDistrict)
        .slice(0, 4);
      // 그 중 짝수 인덱스 (0,2) → 2개
      filteredEvents = nonGuroEvents.filter((_, index) => index % 2 === 0);
    } else if (position === 'bottom5') {
      // 전체 이벤트: 구로구 제외한 이벤트 4개 먼저 필터링
      const nonGuroEvents = upcomingEvents
        .filter(event => event.GUNAME !== selectedDistrict)
        .slice(0, 4);
      // 그 중 홀수 인덱스 (1,3) → 2개
      filteredEvents = nonGuroEvents.filter((_, index) => index % 2 === 1);
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