import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Event from "../components/Event/Event";
import RotatingLogo34 from "../components/Logo/RotatingLogo34";
import { Logo4 } from "../components/Logo/Logo";
import Clock from "../components/Clock/Clock";
import Clock2 from "../components/Clock/Clock2";
import DigitalClock from "../components/Clock/DigitalClock";
import Weather from "../components/Weather/Weather";
import Stink from "../components/Stink/Stink";
import WaterLevel from "../components/WaterLevel/WaterLevel";
import {
  saveMediaToIndexedDB,
  loadMediaFromIndexedDB,
  loadAllMediaFromIndexedDB,
  deleteMediaFromIndexedDB,
} from "../utils/indexedDB";

const INTERVALS = [30000, 20000, 20000, 20000, 20000];
const DEFAULT_CUSTOM_INTERVAL = 20000; // 새로운 섹션의 기본 인터벌 (20초)
const PROTECTED_SECTIONS = [0, 1, 2, 3, 4]; // 제거 불가능한 기본 섹션들
const MAX_SECTIONS = 16; // 최대 섹션 개수

export const useSectionManager = (
  initialDistrict = "강남구",
  onWaterLevelChange,
  waterLevel,
  sectionOrder = null
) => {
  // localStorage에서 커스텀 섹션 정보 불러오기 (섹션 목록, 인터벌, 이름, 시계 타입, 레이아웃, 활성화 여부)
  const loadFromStorage = () => {
    try {
      const savedSections = localStorage.getItem('customSections');
      const savedIntervals = localStorage.getItem('customIntervals');
      const savedNames = localStorage.getItem('customSectionNames');
      const savedClockType = localStorage.getItem('clockType');
      const savedLayouts = localStorage.getItem('customSectionLayouts');
      const savedActiveSections = localStorage.getItem('activeSections');
      
      return {
        sections: savedSections ? JSON.parse(savedSections) : [],
        intervals: savedIntervals ? JSON.parse(savedIntervals) : {},
        names: savedNames ? JSON.parse(savedNames) : {},
        clockType: savedClockType || 'analog', // 기본값: 아날로그
        layouts: savedLayouts ? JSON.parse(savedLayouts) : {}, // 기본값: 빈 객체 (MIDDLE only)
        activeSections: savedActiveSections ? JSON.parse(savedActiveSections) : null, // null이면 기본값 사용
      };
    } catch (error) {
      console.error('localStorage 로드 실패:', error);
      return { sections: [], intervals: {}, names: {}, clockType: 'analog', layouts: {}, activeSections: null };
    }
  };

  const savedData = loadFromStorage();

  const computeInitialActiveSections = (data) => {
    if (data.activeSections && Array.isArray(data.activeSections)) {
      return data.activeSections.filter((section) => section !== 4);
    }
    const baseSections = [0, 1, 2, 3];
    return data.sections.length > 0
      ? [...baseSections, ...data.sections].sort()
      : baseSections;
  };

  const initialActiveSections = computeInitialActiveSections(savedData);

  const [selectedDistrict, setSelectedDistrict] = useState(initialDistrict);
  const [activeSections, setActiveSections] = useState(() => initialActiveSections);
  const [currentSection, setCurrentSection] = useState(() =>
    initialActiveSections.length > 0 ? Math.min(...initialActiveSections) : 0
  );
  const [customSections, setCustomSections] = useState(savedData.sections); // 동적으로 추가된 섹션들
  
  // 기본 섹션의 기본값과 저장된 값 병합
  const initialIntervals = { ...savedData.intervals };
  PROTECTED_SECTIONS.forEach(index => {
    if (initialIntervals[index] === undefined) {
      initialIntervals[index] = INTERVALS[index];
    }
  });
  const [customIntervals, setCustomIntervals] = useState(initialIntervals); // 모든 섹션의 인터벌 저장
  
  // 기본 섹션의 기본 이름과 저장된 이름 병합
  const defaultNames = {
    0: "문구",
    1: "미세먼지및 오존",
    2: "이벤트",
    3: "전체이벤트",
    4: "수위데이터",
  };
  const initialNames = { ...savedData.names };
  PROTECTED_SECTIONS.forEach(index => {
    if (initialNames[index] === undefined && defaultNames[index]) {
      initialNames[index] = defaultNames[index];
    }
  });
  const [customSectionNames, setCustomSectionNames] = useState(initialNames); // 모든 섹션의 이름 저장
  const [customMedia, setCustomMedia] = useState({}); // 커스텀 섹션의 미디어 정보 저장 { sectionIndex: { type: 'image'|'video', url: string } }

  // blob: 형태 ObjectURL만 안전하게 해제 (data:/http(s):/IndexedDB 로드 URL은 무시)
  const revokeBlobUrl = (url) => {
    if (typeof url === 'string' && url.startsWith('blob:')) {
      try { URL.revokeObjectURL(url); } catch { /* noop */ }
    }
  };
  const [clockType, setClockType] = useState(savedData.clockType); // 시계 타입: 'analog' 또는 'digital'
  const [customSectionLayouts, setCustomSectionLayouts] = useState(savedData.layouts); // 커스텀 섹션의 레이아웃 저장 { sectionIndex: 'top-middle-bottom' | 'top-middle' | 'middle' }

  // 현재 섹션이 비활성이면, 켜진 섹션 중 가장 작은 인덱스로 (재시작 시 0만 켜져 있지 않을 때 빈 화면 방지)
  useEffect(() => {
    if (activeSections.length === 0) return;
    if (!activeSections.includes(currentSection)) {
      setCurrentSection(Math.min(...activeSections));
    }
  }, [activeSections, currentSection]);

  // IndexedDB에서 미디어 불러오기
  useEffect(() => {
    const loadMedia = async () => {
      try {
        const allMedia = await loadAllMediaFromIndexedDB();
        setCustomMedia(allMedia);
      } catch (error) {
        console.error('IndexedDB 미디어 로드 실패:', error);
      }
    };
    loadMedia();
  }, []); 
  const [weatherData, setWeatherData] = useState({
    pm10Grade: "좋음",
    pm2_5Grade: "좋음",
  });
  const [machineStatus, setMachineStatus] = useState(false);

  // 섹션의 인터벌을 가져오는 함수
  const getSectionInterval = (sectionIndex) => {
    // 저장된 인터벌이 있으면 우선 사용
    if (customIntervals[sectionIndex] !== undefined) {
      return customIntervals[sectionIndex];
    }
    // 기본 섹션의 기본 인터벌
    if (INTERVALS[sectionIndex] !== undefined) {
      return INTERVALS[sectionIndex];
    }
    // 커스텀 섹션의 기본값
    return DEFAULT_CUSTOM_INTERVAL;
  };

  // localStorage에 섹션 정보 저장 (커스텀 섹션 목록, 모든 섹션의 인터벌과 이름, 시계 타입, 레이아웃, 활성화 여부)
  useEffect(() => {
    try {
      localStorage.setItem('customSections', JSON.stringify(customSections));
      // 모든 섹션의 인터벌과 이름 저장 (기본 섹션 포함)
      localStorage.setItem('customIntervals', JSON.stringify(customIntervals));
      localStorage.setItem('customSectionNames', JSON.stringify(customSectionNames));
      localStorage.setItem('clockType', clockType);
      localStorage.setItem('customSectionLayouts', JSON.stringify(customSectionLayouts));
      localStorage.setItem('activeSections', JSON.stringify(activeSections));
    } catch (error) {
      console.error('localStorage 저장 실패:', error);
    }
  }, [customSections, customIntervals, customSectionNames, clockType, customSectionLayouts, activeSections]);

  // IndexedDB에 미디어 저장
  useEffect(() => {
    const saveMedia = async () => {
      try {
        // 각 섹션의 미디어를 IndexedDB에 저장
        for (const sectionIndex of customSections) {
          if (customMedia[sectionIndex] && customMedia[sectionIndex].base64) {
            await saveMediaToIndexedDB(sectionIndex, customMedia[sectionIndex]);
          }
        }
      } catch (error) {
        console.error('IndexedDB 미디어 저장 실패:', error);
      }
    };
    saveMedia();
  }, [customMedia, customSections]);

  // 자동 전환 타이머 추적
  const autoTransitionTimerRef = useRef(null);

  useEffect(() => {
    if (activeSections.length === 0) return;

    // 기존 타이머 클리어
    if (autoTransitionTimerRef.current) {
      clearTimeout(autoTransitionTimerRef.current);
    }

    const showNextContainer = () => {
      // sectionOrder가 있으면 그 순서를 따르고, 없으면 activeSections 순서 사용
      let orderedActiveSections = activeSections;
      if (sectionOrder && sectionOrder.length > 0) {
        // sectionOrder에서 활성화된 섹션만 필터링하고 순서 유지
        orderedActiveSections = sectionOrder.filter(section => activeSections.includes(section));
      }
      
      const currentIdx = orderedActiveSections.indexOf(currentSection);
      const nextIdx = (currentIdx + 1) % orderedActiveSections.length;
      setCurrentSection(orderedActiveSections[nextIdx]);
    };

    autoTransitionTimerRef.current = setTimeout(showNextContainer, getSectionInterval(currentSection));
    return () => {
      if (autoTransitionTimerRef.current) {
        clearTimeout(autoTransitionTimerRef.current);
      }
    };
  }, [currentSection, activeSections, customIntervals, sectionOrder]);

  const sections = useMemo(() => {
    const baseSections = {
      top: [
      <div
        key="top1"
        className="section-top"
        id="top1"
        style={{
          display:
            currentSection === 0 && activeSections.includes(0)
              ? "flex"
              : "none",
        }}
      >
       <RotatingLogo34 style={{ width: "126px", height: "50px" }} />
      </div>,

      <div
        key="top2"
        className="section-top"
        id="top2"
        style={{
          display:
            currentSection === 1 && activeSections.includes(1)
              ? "flex"
              : "none",
          "--filter-value1":
            weatherData.pm10Grade === "좋음"
              ? "invert(40%) sepia(90%) saturate(1956%) hue-rotate(172deg) brightness(92%) contrast(104%)"
              : weatherData.pm10Grade === "보통"
              ? "invert(60%) sepia(84%) saturate(381%) hue-rotate(38deg) brightness(95%) contrast(99%)"
              : weatherData.pm10Grade === "나쁨"
              ? "invert(10%) sepia(95%) saturate(2574%) hue-rotate(3deg) brightness(153%) contrast(95%)"
              : "invert(57%) sepia(44%) saturate(539%) hue-rotate(314deg) brightness(100%) contrast(89%)",
          "--filter-value2":
            weatherData.pm2_5Grade === "좋음"
              ? "invert(40%) sepia(90%) saturate(1956%) hue-rotate(172deg) brightness(92%) contrast(104%)"
              : weatherData.pm2_5Grade === "보통"
              ? "invert(35%) sepia(94%) saturate(381%) hue-rotate(38deg) brightness(95%) contrast(99%)"
              : weatherData.pm2_5Grade === "나쁨"
              ? "invert(76%) sepia(98%) saturate(784%) hue-rotate(17deg) brightness(123%) contrast(104%)"
              : "invert(62%) sepia(50%) saturate(420%) hue-rotate(20deg) brightness(122%) contrast(130%)",
          "--filter-value3": machineStatus
            ? "invert(8%) sepia(90%) saturate(345%) hue-rotate(341deg) brightness(101%) contrast(102%)"
            : "invert(40%) sepia(90%) saturate(1956%) hue-rotate(172deg) brightness(92%) contrast(104%)",
        }}
      >
        <div className="background3"></div>
        <RotatingLogo34 style={{ width: "126px" }} />
        <div className="air-quality">
          <div className="air-quality-text">
            <h1>{selectedDistrict}</h1>
            <p>오늘의 대기질</p>
          </div>

          <Weather
            selectedDistrict={selectedDistrict}
            onWeatherUpdate={setWeatherData}
          />
          <Stink id="stink-data-page2" onStatusChange={setMachineStatus} />
        </div>
      </div>,

      <div
        key="top3"
        className="section-top"
        id="top3"
        style={{
          display:
            currentSection === 2 && activeSections.includes(2)
              ? "flex"
              : "none",
        }}
      >
        <RotatingLogo34 style={{ width: "126px", height: "70px" }} />
        {clockType === 'digital' ? <DigitalClock /> : clockType === 'analog2' ? <Clock2 /> : <Clock />}
        <span style={{ color: "white" }}>문화행사</span>
      </div>,
      <div
        key="top4"
        className="section-top"
        id="top4"
        style={{
          display:
            currentSection === 3 && activeSections.includes(3)
              ? "flex"
              : "none",
        }}
      >
        <RotatingLogo34 style={{ width: "126px", height: "70px" }} />
        {clockType === 'digital' ? <DigitalClock /> : clockType === 'analog2' ? <Clock2 /> : <Clock />}
        <span style={{ color: "white" }}>문화행사</span>
      </div>,
      <div
        key="top5"
        className="section-top"
        id="top5"
        style={{
          display:
            currentSection === 4 && activeSections.includes(4)
              ? "flex"
              : "none",
        }}
      >
        <Logo4 id="logo-section-water" />
      </div>,
    ],

    middle: [
      <div
        key="middle1"
        className="section-middle"
        id="middle1"
        style={{
          display:
            currentSection === 0 && activeSections.includes(0)
              ? "flex"
              : "none",
        }}
      >
        <img
          src="/images/홍보문구.png"
          alt="middle1"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>,
      <div
        key="middle2"
        className="section-middle"
        id="middle2"
        style={{
          display:
            currentSection === 1 && activeSections.includes(1)
              ? "flex"
              : "none",
        }}
      ></div>,
      <div
        key="middle3"
        className="section-middle"
        id="middle3"
        style={{
          display:
            currentSection === 2 && activeSections.includes(2)
              ? "flex"
              : "none",
        }}
      >
        <Event
          key="middle3-event"
          selectedDistrict={selectedDistrict}
          position="middle4"
        />
      </div>,
      <div
        key="middle4"
        className="section-middle"
        id="middle4"
        style={{
          display:
            currentSection === 3 && activeSections.includes(3)
              ? "flex"
              : "none",
        }}
      >
        <Event
          key="middle4-event"
          selectedDistrict={selectedDistrict}
          position="middle5"
        />
      </div>,
      <div
        key="middle5"
        className="section-middle"
        id="middle5"
        style={{
          display:
            currentSection === 4 && activeSections.includes(4)
              ? "flex"
              : "none",
        }}
      >
        <WaterLevel onWaterLevelChange={onWaterLevelChange} />
      </div>,
    ],

    bottom: [
      <div
        key="bottom1"
        className="section-bottom"
        id="bottom1"
        style={{
          display:
            currentSection === 0 && activeSections.includes(0)
              ? "flex"
              : "none",
        }}
      ></div>,
      <div
        key="bottom2"
        className="section-bottom"
        id="bottom2"
        style={{
          display:
            currentSection === 1 && activeSections.includes(1)
              ? "flex"
              : "none",
        }}
      ></div>,
      <div
        key="bottom3"
        className="section-bottom"
        id="bottom3"
        style={{
          display:
            currentSection === 2 && activeSections.includes(2)
              ? "flex"
              : "none",
        }}
      >
        <Event
          key="bottom3-event"
          selectedDistrict={selectedDistrict}
          position="bottom4"
        />
      </div>,
      <div
        key="bottom4"
        className="section-bottom"
        id="bottom4"
        style={{
          display:
            currentSection === 3 && activeSections.includes(3)
              ? "flex"
              : "none",
        }}
      >
        <Event
          key="bottom4-event"
          selectedDistrict={selectedDistrict}
          position="bottom5"
        />
      </div>,
      <div
        key="bottom5"
        className="section-bottom"
        id="bottom5"
        style={{
          display:
            currentSection === 4 && activeSections.includes(4)
              ? "flex"
              : "none",
        }}
      >
        <div className="water-level-warning">
          <div className="warning-text">
            <span>진입</span>
            <span>주의</span>
          </div>
        </div>
      </div>,
    ],
    };

    // 커스텀 섹션을 동적으로 추가 (레이아웃에 따라)
    customSections.forEach((sectionIndex) => {
      if (activeSections.includes(sectionIndex)) {
        const media = customMedia[sectionIndex];
        const isActive = currentSection === sectionIndex && activeSections.includes(sectionIndex);
        const layout = customSectionLayouts[sectionIndex] || 'middle'; // 기본값: middle only
        
        // 미디어 렌더링 함수
        const renderMedia = () => {
          if (!media || !media.url) {
            return (
              <div style={{ color: "#fff", padding: "10px", fontSize: "12px" }}>
                미디어 없음 (섹션 {sectionIndex})
              </div>
            );
          }
          
          if (media.type === "image") {
            return (
              <img
                key={`img-${sectionIndex}-${Date.now()}`}
                src={media.url}
                alt={`Custom section ${sectionIndex}`}
                style={{
                  width: "128px",
                  height: "768px",
                  display: "block",
                  visibility: "visible",
                  opacity: 1,
                  position: "relative",
                  zIndex: 1001,
                }}
                onLoad={(e) => {
                  const img = e.target;
                  const computed = window.getComputedStyle(img);
                  const parent = img.parentElement;
                  const parentComputed = window.getComputedStyle(parent);
                  console.log(`[섹션 ${sectionIndex}] 이미지 로드 성공`);
                  console.log(`  - URL: ${media.url}`);
                  console.log(`  - 원본: ${img.naturalWidth}x${img.naturalHeight}`);
                  console.log(`  - 표시: ${img.width}x${img.height}`);
                  console.log(`  - display: ${computed.display}`);
                  console.log(`  - visibility: ${computed.visibility}`);
                  console.log(`  - opacity: ${computed.opacity}`);
                  console.log(`  - 부모 display: ${parentComputed.display}`);
                  console.log(`  - 부모 position: ${parentComputed.position}`);
                  console.log(`  - 부모 z-index: ${parentComputed.zIndex}`);
                  console.log(`  - DOM에 존재:`, document.body.contains(img));
                }}
                onError={(e) => {
                  console.error(`[섹션 ${sectionIndex}] 이미지 로드 실패:`, media.url);
                }}
              />
            );
          }
          
          if (media.type === "video") {
            return (
              <video
                key={`video-${sectionIndex}-${media.url}`}
                src={media.url}
                autoPlay
                loop
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            );
          }
          
          return null;
        };

        // 레이아웃에 따라 다른 위치에 렌더링
        if (layout === 'top-middle-bottom') {
          // TOP: 로고 + 시계 (기본 섹션 top4, top5와 동일한 구조)
          const isActive = currentSection === sectionIndex && activeSections.includes(sectionIndex);
          
          baseSections.top.push(
            <div
              key={`custom-top-${sectionIndex}`}
              className="section-top"
              id={`custom-top-${sectionIndex}`}
              style={{
                display: isActive ? "flex" : "none",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1rem",
                minHeight: "25%",
                paddingBottom: "1rem",
              }}
            >
              <RotatingLogo34
                style={{ width: "126px", height: "70px", marginTop: "8px" }}
              />
              <div style={{ marginTop: "-1.5rem" }}>
                {clockType === 'digital' ? <DigitalClock /> : clockType === 'analog2' ? <Clock2 /> : <Clock />}
              </div>
            </div>
          );
          
          // MIDDLE: 이미지/영상
          baseSections.middle.push(
            <div
              key={`custom-middle-${sectionIndex}`}
              className="section-middle"
              id={`custom-middle-${sectionIndex}`}
              style={{
                display: isActive ? "flex" : "none",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                height: "100%",
                overflow: "hidden",
              }}
            >
              {(() => {
                if (!media || !media.url) {
                  return (
                    <div style={{ color: "#fff", padding: "10px", fontSize: "12px" }}>
                      미디어 없음 (섹션 {sectionIndex})
                    </div>
                  );
                }
                
                if (media.type === "image") {
                  // 레이아웃에 맞는 정확한 크기 계산
                  let imageHeight = 768; // 기본값: MIDDLE only
                  let marginTop = 0;
                  
                  if (layout === 'top-middle') {
                    imageHeight = 698;
                    marginTop = -(768 - 698); // -70px (위로 올림)
                  } else if (layout === 'top-middle-bottom') {
                    imageHeight = 560;
                    marginTop = -(768 - 560); // -208px (위로 올림)
                  }
                  
                  return (
                    <img
                      key={`img-middle-${sectionIndex}`}
                      src={media.url}
                      alt={`Custom section ${sectionIndex}`}
                      style={{
                        width: "128px",
                        height: `${imageHeight}px`,
                        display: "block",
                        marginTop: `${marginTop}px`,
                      }}
                    />
                  );
                }
                
                // 동영상은 원본 크기로 재생되면서 잘리도록 설정
                if (media.type === "video") {
                  // 레이아웃에 맞는 높이 계산
                  let videoHeight = 768; // 기본값: MIDDLE only
                  let marginTop = 0;
                  
                  if (layout === 'top-middle') {
                    videoHeight = 698;
                    marginTop = -(768 - 698); // -70px (위로 올림)
                  } else if (layout === 'top-middle-bottom') {
                    videoHeight = 560;
                    marginTop = -(768 - 560); // -208px (위로 올림)
                  }
                  
                  return (
                    <video
                      key={`video-middle-${sectionIndex}`}
                      src={media.url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{
                        width: "auto",
                        height: `${videoHeight}px`,
                        display: "block",
                        marginTop: `${marginTop}px`,
                      }}
                    />
                  );
                }
                
                return null;
              })()}
            </div>
          );
        } else if (layout === 'top-middle') {
          // TOP: 로고만
          baseSections.top.push(
            <div
              key={`custom-top-${sectionIndex}`}
              className="section-top"
              id={`custom-top-${sectionIndex}`}
              style={{
                display: isActive ? "flex" : "none",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RotatingLogo34
                style={{ width: "126px", height: "70px", marginTop: "8px" }}
              />
            </div>
          );
          
          // MIDDLE: 미디어 (COVER)
          baseSections.middle.push(
            <div
              key={`custom-middle-${sectionIndex}`}
              className="section-middle"
              id={`custom-middle-${sectionIndex}`}
              style={{
                display: isActive ? "flex" : "none",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                height: "100%",
                overflow: "hidden",
              }}
            >
              {(() => {
                if (!media || !media.url) {
                  return (
                    <div style={{ color: "#fff", padding: "10px", fontSize: "12px" }}>
                      미디어 없음 (섹션 {sectionIndex})
                    </div>
                  );
                }
                
                if (media.type === "image") {
                  // 레이아웃에 맞는 정확한 크기 계산
                  let imageHeight = 768; // 기본값: MIDDLE only
                  let marginTop = 0;
                  
                  if (layout === 'top-middle') {
                    imageHeight = 698;
                    marginTop = -(768 - 698); // -70px (위로 올림)
                  } else if (layout === 'top-middle-bottom') {
                    imageHeight = 560;
                    marginTop = -(768 - 560); // -208px (위로 올림)
                  }
                  
                  return (
                    <img
                      key={`img-middle-${sectionIndex}`}
                      src={media.url}
                      alt={`Custom section ${sectionIndex}`}
                      style={{
                        width: "128px",
                        height: `${imageHeight}px`,
                        display: "block",
                        marginTop: `${marginTop}px`,
                      }}
                    />
                  );
                }
                
                // 동영상은 원본 크기로 재생되면서 잘리도록 설정
                if (media.type === "video") {
                  // 레이아웃에 맞는 높이 계산
                  let videoHeight = 768; // 기본값: MIDDLE only
                  let marginTop = 0;
                  
                  if (layout === 'top-middle') {
                    videoHeight = 698;
                    marginTop = -(768 - 698); // -70px (위로 올림)
                  } else if (layout === 'top-middle-bottom') {
                    videoHeight = 560;
                    marginTop = -(768 - 560); // -208px (위로 올림)
                  }
                  
                  return (
                    <video
                      key={`video-middle-${sectionIndex}`}
                      src={media.url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{
                        width: "auto",
                        height: `${videoHeight}px`,
                        display: "block",
                        marginTop: `${marginTop}px`,
                      }}
                    />
                  );
                }
                
                return null;
              })()}
            </div>
          );
        } else {
          // MIDDLE only: 기존 방식
          baseSections.middle.push(
            <div
              key={`custom-section-${sectionIndex}`}
              className="section-middle"
              id={`custom-section-${sectionIndex}`}
              style={{
                display: isActive ? "flex" : "none",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                position: isActive ? "absolute" : "relative",
                top: 0,
                left: 0,
                backgroundColor: "#000",
                zIndex: isActive ? 1000 : 0,
              }}
            >
              {(() => {
                if (!media || !media.url) {
                  return (
                    <div style={{ color: "#fff", padding: "10px", fontSize: "12px" }}>
                      미디어 없음 (섹션 {sectionIndex})
                    </div>
                  );
                }
                
                if (media.type === "image") {
                  // 레이아웃에 맞는 정확한 크기 계산
                  let imageHeight = 768; // 기본값: MIDDLE only
                  let marginTop = 0;
                  
                  if (layout === 'top-middle') {
                    imageHeight = 698;
                    marginTop = -(768 - 698); // -70px (위로 올림)
                  } else if (layout === 'top-middle-bottom') {
                    imageHeight = 560;
                    marginTop = -(768 - 560); // -208px (위로 올림)
                  }
                  
                  return (
                    <img
                      key={`img-middle-${sectionIndex}`}
                      src={media.url}
                      alt={`Custom section ${sectionIndex}`}
                      style={{
                        width: "128px",
                        height: `${imageHeight}px`,
                        display: "block",
                        marginTop: `${marginTop}px`,
                      }}
                    />
                  );
                }
                
                // 동영상은 원본 크기로 재생되면서 잘리도록 설정
                if (media.type === "video") {
                  // 레이아웃에 맞는 높이 계산
                  let videoHeight = 768; // 기본값: MIDDLE only
                  let marginTop = 0;
                  
                  if (layout === 'top-middle') {
                    videoHeight = 698;
                    marginTop = -(768 - 698); // -70px (위로 올림)
                  } else if (layout === 'top-middle-bottom') {
                    videoHeight = 560;
                    marginTop = -(768 - 560); // -208px (위로 올림)
                  }
                  
                  return (
                    <video
                      key={`video-middle-${sectionIndex}`}
                      src={media.url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{
                        width: "auto",
                        height: `${videoHeight}px`,
                        display: "block",
                        marginTop: `${marginTop}px`,
                      }}
                    />
                  );
                }
                
                return null;
              })()}
            </div>
          );
        }
      }
    });

    return baseSections;
  }, [
    customSections, 
    customMedia, 
    activeSections, 
    currentSection, 
    selectedDistrict, 
    weatherData, 
    machineStatus,
    clockType,
    customSectionLayouts
  ]);

  const toggleSection = useCallback((index) => {
    if (index === 4 && waterLevel <= 0.25) {
      return;
    }

    if (waterLevel > 0.25 && index !== 4) {
      return;
    }

    // 버튼 클릭 시 활성화된 섹션으로만 전환 (활성화/비활성화는 설정 탭에서만)
    if (activeSections.includes(index)) {
      if (currentSection !== index) {
        // 기존 자동 전환 타이머 리셋
        if (autoTransitionTimerRef.current) {
          clearTimeout(autoTransitionTimerRef.current);
          autoTransitionTimerRef.current = null;
        }
        // 즉시 섹션 전환
        setCurrentSection(index);
      }
    }
    // 비활성화된 섹션은 클릭해도 아무 동작 안 함
  }, [activeSections, currentSection, waterLevel]);

  // 커스텀 섹션 추가 (보호된 섹션 제외)
  const addCustomSection = (index, interval = DEFAULT_CUSTOM_INTERVAL, media = null) => {
    if (PROTECTED_SECTIONS.includes(index)) {
      console.warn(`섹션 ${index}는 기본 섹션이므로 추가할 수 없습니다.`);
      return false;
    }
    if (activeSections.includes(index)) {
      console.warn(`섹션 ${index}는 이미 활성화되어 있습니다.`);
      return false;
    }
    if (activeSections.length >= MAX_SECTIONS) {
      console.warn(`최대 ${MAX_SECTIONS}개의 섹션만 추가할 수 있습니다.`);
      return false;
    }
    
    // sectionOrder가 있으면 그 순서를 따르고, 없으면 sort() 사용
    let newActiveSections = [...activeSections, index];
    if (sectionOrder && sectionOrder.length > 0) {
      // sectionOrder에서 활성화된 섹션만 필터링하고 순서 유지
      newActiveSections = sectionOrder.filter(section => newActiveSections.includes(section));
    } else {
      newActiveSections.sort();
    }
    setActiveSections(newActiveSections);
    
    setCustomSections([...customSections, index].sort());
    setCustomIntervals({ ...customIntervals, [index]: interval });
    if (media) {
      // 같은 index 에 이전 blob URL 이 남아있으면 메모리 누수 방지 차원에서 해제
      if (customMedia[index]?.url && customMedia[index].url !== media.url) {
        revokeBlobUrl(customMedia[index].url);
      }
      setCustomMedia({ ...customMedia, [index]: media });
    }
    setCurrentSection(index);
    return true;
  };

  // 커스텀 섹션 제거 (보호된 섹션은 제거 불가)
  const removeCustomSection = async (index) => {
    if (PROTECTED_SECTIONS.includes(index)) {
      console.warn(`섹션 ${index}는 기본 섹션이므로 제거할 수 없습니다.`);
      return false;
    }
    
    // active(ON) 상태를 지울 때만 "최소 하나" 제약을 적용
    const isActive = activeSections.includes(index);
    if (isActive && activeSections.length <= 1) {
      console.warn(`최소 하나의 섹션은 활성화되어 있어야 합니다.`);
      return false;
    }
    
    // 이미 customSections에 없는 인덱스를 제거하려는 경우엔 아무것도 하지 않음
    if (!customSections.includes(index)) {
      console.warn(`섹션 ${index}는 커스텀 섹션이 아닙니다.`);
      return false;
    }

    // IndexedDB에서 미디어 삭제
    try {
      await deleteMediaFromIndexedDB(index);
    } catch (error) {
      console.error('IndexedDB 미디어 삭제 실패:', error);
    }

    if (isActive) {
      setActiveSections(activeSections.filter((i) => i !== index));
    }
    setCustomSections(customSections.filter((i) => i !== index));
    const newIntervals = { ...customIntervals };
    delete newIntervals[index];
    setCustomIntervals(newIntervals);
    const newNames = { ...customSectionNames };
    delete newNames[index];
    setCustomSectionNames(newNames);
    const newMedia = { ...customMedia };
    // 섹션 삭제 시 ObjectURL 해제 (탭 메모리 누수 방지)
    revokeBlobUrl(newMedia[index]?.url);
    delete newMedia[index];
    setCustomMedia(newMedia);
    
    // 현재 섹션이 삭제되는 경우 다음 활성 섹션으로 이동
    if (currentSection === index && isActive) {
      const nextSection = activeSections.find((i) => i !== index);
      setCurrentSection(nextSection);
    }
    return true;
  };

  // 커스텀 섹션의 미디어 설정
  const setCustomSectionMedia = (index, media) => {
    if (PROTECTED_SECTIONS.includes(index)) {
      console.warn(`섹션 ${index}는 기본 섹션이므로 미디어를 설정할 수 없습니다.`);
      return false;
    }
    if (!customSections.includes(index)) {
      console.warn(`섹션 ${index}는 커스텀 섹션이 아닙니다.`);
      return false;
    }

    // 미디어 교체 시 이전 ObjectURL 해제 (LED 키오스크 24/7 운영 → 누적 누수 방지)
    const prevUrl = customMedia[index]?.url;
    if (prevUrl && prevUrl !== media?.url) {
      revokeBlobUrl(prevUrl);
    }
    setCustomMedia({ ...customMedia, [index]: media });
    return true;
  };

  // 섹션의 인터벌 변경 (기본 섹션 포함)
  const setCustomSectionInterval = (index, interval) => {
    if (index === 4) {
      console.warn(`수위데이터 섹션 인터벌은 변경할 수 없습니다.`);
      return false;
    }
    if (!activeSections.includes(index)) {
      console.warn(`섹션 ${index}는 활성화되어 있지 않습니다.`);
      return false;
    }
    if (interval <= 0) {
      console.warn(`인터벌은 0보다 커야 합니다.`);
      return false;
    }
    
    setCustomIntervals({ ...customIntervals, [index]: interval });
    return true;
  };

  // 섹션의 이름 변경 (기본 섹션 포함)
  const setCustomSectionName = (index, name) => {
    if (index === 4) {
      console.warn(`수위데이터 섹션 이름은 변경할 수 없습니다.`);
      return false;
    }
    if (!name || name.trim() === '') {
      console.warn(`섹션 이름은 비어있을 수 없습니다.`);
      return false;
    }
    
    setCustomSectionNames({ ...customSectionNames, [index]: name.trim() });
    return true;
  };

  // 섹션 이름 가져오기 (커스텀 이름이 있으면 사용, 없으면 기본값)
  const getSectionName = (index) => {
    if (customSectionNames[index]) {
      return customSectionNames[index];
    }
    return `섹션 ${index}`;
  };

  // 섹션이 보호된 섹션인지 확인
  const isProtectedSection = (index) => {
    return PROTECTED_SECTIONS.includes(index);
  };

  // 커스텀 섹션의 레이아웃 설정
  const setCustomSectionLayout = (index, layout) => {
    if (PROTECTED_SECTIONS.includes(index)) {
      console.warn(`섹션 ${index}는 기본 섹션이므로 레이아웃을 설정할 수 없습니다.`);
      return false;
    }
    if (!customSections.includes(index)) {
      console.warn(`섹션 ${index}는 커스텀 섹션이 아닙니다.`);
      return false;
    }
    if (!['top-middle-bottom', 'top-middle', 'middle'].includes(layout)) {
      console.warn(`잘못된 레이아웃 타입입니다: ${layout}`);
      return false;
    }
    
    setCustomSectionLayouts({ ...customSectionLayouts, [index]: layout });
    return true;
  };

  // 커스텀 섹션의 레이아웃 가져오기
  const getCustomSectionLayout = (index) => {
    return customSectionLayouts[index] || 'middle'; // 기본값: middle only
  };

  const getButtonStyle = (index) => ({
    backgroundColor:
      currentSection === index
        ? "#3b82f6"
        : activeSections.includes(index)
        ? "#666"
        : "#333",
    opacity: activeSections.includes(index) ? 1 : 0.5,
  });

  return {
    selectedDistrict,
    setSelectedDistrict,
    toggleSection,
    getButtonStyle,
    sections,
    activeSections,
    setActiveSections,
    currentSection,
    setCurrentSection,
    machineStatus,
    setMachineStatus,
    // 섹션 추가/제거 기능
    addCustomSection,
    removeCustomSection,
    isProtectedSection,
    customSections,
    protectedSections: PROTECTED_SECTIONS,
    // 인터벌 관리
    setCustomSectionInterval,
    getSectionInterval,
    customIntervals,
    defaultCustomInterval: DEFAULT_CUSTOM_INTERVAL,
    // 이름 관리
    setCustomSectionName,
    getSectionName,
    customSectionNames,
    // 미디어 관리
    setCustomSectionMedia,
    customMedia,
    // 시계 타입 관리
    clockType,
    setClockType,
    // 레이아웃 관리
    setCustomSectionLayout,
    getCustomSectionLayout,
    customSectionLayouts,
  };
};
