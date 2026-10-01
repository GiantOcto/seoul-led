import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import RotatingLogo34 from "../components/Logo/RotatingLogo34";
import Stink from "../components/Stink/Stink";
import AnalogClock from "../components/Clock/AnalogClock";
import DigitalClock from "../components/Clock/DigitalClock";
import { LED_WIDTH, getMediaHeight } from "../constants/led";
import {
  saveMediaToIndexedDB,
  loadAllMediaFromIndexedDB,
  deleteMediaFromIndexedDB,
} from "../utils/indexedDB";

const INTERVALS = { 0: 20000, 1: 20000 }; // 기본 섹션 인터벌 (시계, 악취)
const DEFAULT_CUSTOM_INTERVAL = 20000; // 새로운 섹션의 기본 인터벌 (20초)
const PROTECTED_SECTIONS = [0, 1]; // 제거 불가능한 기본 섹션 (시계, 악취)
const MAX_SECTIONS = 16; // 최대 섹션 개수

export const useSectionManager = (sectionOrder = null) => {
  // localStorage에서 커스텀 섹션 정보 불러오기 (섹션 목록, 인터벌, 이름, 시계 타입, 활성화 여부)
  const loadFromStorage = () => {
    try {
      const savedSections = localStorage.getItem('customSections');
      const savedIntervals = localStorage.getItem('customIntervals');
      const savedNames = localStorage.getItem('customSectionNames');
      const savedClockType = localStorage.getItem('clockType');
      const savedLogos = localStorage.getItem('customSectionLogos');
      const savedActiveSections = localStorage.getItem('activeSections');

      return {
        sections: savedSections ? JSON.parse(savedSections) : [],
        intervals: savedIntervals ? JSON.parse(savedIntervals) : {},
        names: savedNames ? JSON.parse(savedNames) : {},
        clockType: savedClockType || 'analog', // 기본값: 아날로그
        logos: savedLogos ? JSON.parse(savedLogos) : {}, // 기본값: 로고 없이 전체화면
        activeSections: savedActiveSections ? JSON.parse(savedActiveSections) : null, // null이면 기본값 사용
      };
    } catch (error) {
      console.error('localStorage 로드 실패:', error);
      return { sections: [], intervals: {}, names: {}, clockType: 'analog', logos: {}, activeSections: null };
    }
  };

  const savedData = loadFromStorage();

  // 제거된 섹션 (수위 2, 행사 3) — 예전 저장값에 남아 있어도 걸러냄
  const DISABLED_SECTIONS = [2, 3];

  const computeInitialActiveSections = (data) => {
    let sections;
    if (data.activeSections && Array.isArray(data.activeSections)) {
      sections = data.activeSections;
    } else {
      const baseSections = [...PROTECTED_SECTIONS];
      sections = data.sections.length > 0
        ? [...baseSections, ...data.sections].sort()
        : baseSections;
    }
    // 비활성화된 섹션 강제 제거 (예전 저장값에 제거된 섹션만 켜져 있었으면 기본 섹션으로 대체)
    const enabled = sections.filter(s => !DISABLED_SECTIONS.includes(s));
    return enabled.length > 0 ? enabled : [...PROTECTED_SECTIONS];
  };

  const initialActiveSections = computeInitialActiveSections(savedData);

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
    0: "시계",
    1: "악취",
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

  const [clockType, setClockType] = useState(savedData.clockType); // 시계 타입: 'analog' | 'analog2' | 'digital'
  const [customSectionLogos, setCustomSectionLogos] = useState(savedData.logos); // 커스텀 섹션 로고 표시 { sectionIndex: boolean }

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

  // localStorage에 섹션 정보 저장 (커스텀 섹션 목록, 모든 섹션의 인터벌과 이름, 시계 타입, 활성화 여부)
  useEffect(() => {
    try {
      localStorage.setItem('customSections', JSON.stringify(customSections));
      // 모든 섹션의 인터벌과 이름 저장 (기본 섹션 포함)
      localStorage.setItem('customIntervals', JSON.stringify(customIntervals));
      localStorage.setItem('customSectionNames', JSON.stringify(customSectionNames));
      localStorage.setItem('clockType', clockType);
      localStorage.setItem('customSectionLogos', JSON.stringify(customSectionLogos));
      localStorage.setItem('activeSections', JSON.stringify(activeSections));
    } catch (error) {
      console.error('localStorage 저장 실패:', error);
    }
  }, [customSections, customIntervals, customSectionNames, clockType, customSectionLogos, activeSections]);

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
        <RotatingLogo34 style={{ width: "126px" }} />
        {clockType === 'digital'
          ? <DigitalClock />
          : <AnalogClock variant={clockType === 'analog2' ? 'light' : 'dark'} />}
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
        }}
      >
        <RotatingLogo34 style={{ width: "126px" }} />
        <Stink id="stink-data-page2" />
      </div>,
    ],

    middle: [],
    };

    // 커스텀 섹션을 동적으로 추가 (전체화면, 또는 로고 표시 시 위에 로고 + 아래 미디어)
    customSections.forEach((sectionIndex) => {
      if (activeSections.includes(sectionIndex)) {
        const media = customMedia[sectionIndex];
        const isActive = currentSection === sectionIndex && activeSections.includes(sectionIndex);
        const hasLogo = Boolean(customSectionLogos[sectionIndex]);
        const mediaHeight = getMediaHeight(hasLogo);

        baseSections.middle.push(
          <div
            key={`custom-section-${sectionIndex}`}
            className={`section-middle${hasLogo ? " custom-section--logo" : ""}`}
            id={`custom-section-${sectionIndex}`}
            style={{
              display: isActive ? "flex" : "none",
              flexDirection: "column",
              justifyContent: hasLogo ? "flex-start" : "center",
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
            {hasLogo && <RotatingLogo34 style={{ width: "126px" }} />}
            <div
              style={{
                width: `${LED_WIDTH}px`,
                height: `${mediaHeight}px`,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
                flexShrink: 0,
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
                  return (
                    <img
                      key={`img-middle-${sectionIndex}`}
                      src={media.url}
                      alt={`Custom section ${sectionIndex}`}
                      style={{
                        width: `${LED_WIDTH}px`,
                        height: `${mediaHeight}px`,
                        display: "block",
                      }}
                    />
                  );
                }

                // 동영상은 원본 비율로 재생되면서 넘치는 좌우가 잘리도록 설정
                if (media.type === "video") {
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
                        height: `${mediaHeight}px`,
                        display: "block",
                      }}
                    />
                  );
                }

                return null;
              })()}
            </div>
          </div>
        );
      }
    });

    return baseSections;
  }, [
    customSections, 
    customMedia, 
    activeSections,
    currentSection,
    clockType,
    customSectionLogos,
  ]);

  const toggleSection = useCallback((index) => {
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
  }, [activeSections, currentSection, sectionOrder]);

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
    const newLogos = { ...customSectionLogos };
    delete newLogos[index];
    setCustomSectionLogos(newLogos);
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
    if (!name || name.trim() === '') {
      console.warn(`섹션 이름은 비어있을 수 없습니다.`);
      return false;
    }
    
    setCustomSectionNames({ ...customSectionNames, [index]: name.trim() });
    return true;
  };

  // 커스텀 섹션 로고 표시 켜기/끄기 (켜면 미디어가 128×206으로 리사이징됨 — App.js)
  const setCustomSectionLogo = (index, isOn) => {
    setCustomSectionLogos({ ...customSectionLogos, [index]: isOn });
  };

  // 섹션 이름 가져오기 (커스텀 이름이 있으면 사용, 없으면 기본값)
  const getSectionName = (index) => {
    if (customSectionNames[index]) {
      return customSectionNames[index];
    }
    return `섹션 ${index}`;
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
    toggleSection,
    getButtonStyle,
    sections,
    activeSections,
    setActiveSections,
    currentSection,
    setCurrentSection,
    // 섹션 추가/제거 기능
    addCustomSection,
    removeCustomSection,
    customSections,
    protectedSections: PROTECTED_SECTIONS,
    // 인터벌 관리
    setCustomSectionInterval,
    getSectionInterval,
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
    // 커스텀 섹션 로고 표시
    customSectionLogos,
    setCustomSectionLogo,
  };
};