import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSectionManager } from "./hooks/useSectionManager";
import { Logo34PairProvider } from "./components/Logo/Logo34PairContext";
import "./App.css";

// 시계 썸네일 컴포넌트
const ClockThumbnail = ({ type }) => {
  const imagePath = type === 'analog' 
    ? '/images/아날로그시계.png' 
    : '/images/디지털시계.png';

  return (
    <img 
      src={imagePath} 
      alt={type === 'analog' ? '아날로그 시계' : '디지털 시계'}
      style={{ 
        width: "80px", 
        height: "80px", 
        objectFit: "contain",
        imageRendering: "pixelated"
      }} 
    />
  );
};

function App() {
  const [waterLevel, setWaterLevel] = useState(0);
  const [previousSections, setPreviousSections] = useState([0, 1, 2, 3]);

  const handleWaterLevelChange = (level) => {
    setWaterLevel(level);
  };

  // 모든 섹션의 순서를 관리하는 state (localStorage에 저장)
  const [sectionOrder, setSectionOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('sectionOrder');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('sectionOrder 로드 실패:', error);
    }
    return null; // 초기값은 null로 설정하고, allSections로 초기화
  });

  const {
    selectedDistrict,
    setSelectedDistrict,
    toggleSection,
    getButtonStyle,
    sections,
    activeSections,
    setActiveSections,
    currentSection,
    setCurrentSection,
    addCustomSection,
    removeCustomSection,
    isProtectedSection,
    customSections,
    setCustomSectionInterval,
    getSectionInterval,
    defaultCustomInterval,
    protectedSections,
    setCustomSectionMedia,
    customMedia,
    setCustomSectionName,
    getSectionName: getSectionNameFromHook,
    customSectionNames,
    clockType,
    setClockType,
    setCustomSectionLayout,
    getCustomSectionLayout,
    customSectionLayouts,
  } = useSectionManager("서초구", handleWaterLevelChange, waterLevel, sectionOrder);

  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionInterval, setNewSectionInterval] = useState(defaultCustomInterval / 1000); // 초 단위로 표시
  const [editingStates, setEditingStates] = useState({}); // { sectionIndex: { name: boolean, interval: boolean } }
  const [editValues, setEditValues] = useState({}); // { sectionIndex: { name: string, interval: number } }
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState(null); // 'before' or 'after' or 'between'
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const draggedButtonRef = useRef(null);
  const sectionControlsRef = useRef(null);

  // 항상 다크 모드 적용
  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
  }, []);

  // 섹션 개수 확인 (버튼 비활성화용)
  const PROTECTED_SECTIONS_COUNT = [0, 1, 2, 3];
  const allSectionsCount = [...PROTECTED_SECTIONS_COUNT, ...customSections].length;
  const isMaxSectionsReached = allSectionsCount >= 16;

  const handleAddSection = () => {
    if (!newSectionName.trim()) {
      alert("섹션 이름을 입력해주세요.");
      return;
    }
    
    // 사용 가능한 다음 섹션 번호 찾기
    const PROTECTED_SECTIONS = [0, 1, 2, 3];
    const allUsedSections = [...PROTECTED_SECTIONS, ...customSections].sort();
    
    // 최대 섹션 개수 확인 (16개)
    if (allUsedSections.length >= 16) {
      alert("최대 16개의 섹션만 추가할 수 있습니다.");
      return;
    }
    
    let nextIndex = 4;
    while (allUsedSections.includes(nextIndex)) {
      nextIndex++;
    }
    
    const interval = newSectionInterval * 1000; // 밀리초로 변환
    if (addCustomSection(nextIndex, interval, null)) {
      setCustomSectionName(nextIndex, newSectionName.trim());
      setNewSectionName("");
      setNewSectionInterval(defaultCustomInterval / 1000);
    }
  };

  // base64를 Blob으로 변환하는 헬퍼 함수
  const dataURLtoBlob = (dataURL) => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // 이미지를 레이아웃에 맞춰 리사이징하는 함수 (Canvas API 사용 - 정확한 크기 보장)
  const resizeImageForLayout = (imageBase64, layout, callback) => {
    let targetWidth = 128;
    let targetHeight = 768; // 기본값: MIDDLE only
    
    if (layout === 'top-middle') {
      targetHeight = 698;
    } else if (layout === 'top-middle-bottom') {
      targetHeight = 560;
    } else {
      targetHeight = 768;
    }
    
    console.log(`리사이징 시작: 레이아웃=${layout}, 목표 크기=${targetWidth}x${targetHeight}`);
    
    const img = new Image();
    img.onload = () => {
      console.log(`원본 이미지 크기: ${img.width}x${img.height}`);
      
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      
      // 이미지 스무딩 품질 향상
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // 비율 무시하고 강제로 targetWidth x targetHeight 크기에 맞춤
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      
      // PNG로 저장하여 무손실 압축 (화질 최대 보존)
      const resizedBase64 = canvas.toDataURL('image/png');
      const resizedBlob = dataURLtoBlob(resizedBase64);
      const resizedUrl = URL.createObjectURL(resizedBlob);
      
      // 리사이징된 이미지 크기 확인
      const resizedImg = new Image();
      resizedImg.onload = () => {
        console.log(`리사이징 완료: ${resizedImg.width}x${resizedImg.height}`);
        if (resizedImg.width === targetWidth && resizedImg.height === targetHeight) {
          callback(resizedBase64, resizedUrl);
        } else {
          console.error(`리사이징 크기 불일치: 예상 ${targetWidth}x${targetHeight}, 실제 ${resizedImg.width}x${resizedImg.height}`);
          callback(resizedBase64, resizedUrl);
        }
      };
      resizedImg.onerror = () => {
        console.error('리사이징된 이미지 검증 실패');
        callback(resizedBase64, resizedUrl);
      };
      resizedImg.src = resizedBase64;
    };
    img.onerror = (error) => {
      console.error('이미지 리사이징 실패:', error);
      callback(null, null);
    };
    img.src = imageBase64;
  };

  const handleMediaChange = (sectionIndex, e) => {
    const file = e.target.files[0];
    if (file) {
      const fileType = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : null;
      if (fileType) {
        if (fileType === "image") {
          // 이미지는 리사이징
          const reader = new FileReader();
          reader.onload = (event) => {
            const originalBase64 = event.target.result;
            const layout = getCustomSectionLayout(sectionIndex);
            
            console.log(`섹션 ${sectionIndex} 이미지 업로드, 레이아웃: ${layout}`);
            
            // 레이아웃에 맞춰 리사이징
            resizeImageForLayout(originalBase64, layout, async (resizedBase64, resizedUrl) => {
              if (resizedBase64 && resizedUrl) {
                console.log(`섹션 ${sectionIndex} 이미지 리사이징 완료`);
                setCustomSectionMedia(sectionIndex, { 
                  type: fileType, 
                  url: resizedUrl, // 리사이징된 이미지 URL
                  base64: resizedBase64, // 리사이징된 base64 데이터
                  originalBase64: originalBase64, // 원본 base64 저장 (나중에 레이아웃 변경 시 사용)
                  fileName: file.name // 파일 이름 저장
                });
              } else {
                console.error(`섹션 ${sectionIndex} 이미지 리사이징 실패`);
                alert("이미지 리사이징 실패");
              }
            });
          };
          reader.onerror = (error) => {
            console.error('파일 읽기 실패:', error);
            alert("파일 읽기 실패");
          };
          reader.readAsDataURL(file);
        } else {
          // 비디오는 리사이징 없이 그대로 저장
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target.result;
            const url = URL.createObjectURL(file);
            setCustomSectionMedia(sectionIndex, { 
              type: fileType, 
              url,
              base64,
              fileName: file.name
            });
          };
          reader.onerror = (error) => {
            console.error('파일 읽기 실패:', error);
            alert("파일 읽기 실패");
          };
          reader.readAsDataURL(file);
        }
      } else {
        alert("이미지 또는 동영상 파일만 선택할 수 있습니다.");
        e.target.value = "";
      }
    }
  };

  // 레이아웃 변경 핸들러 (이미지가 있으면 다시 리사이징)
  const handleLayoutChange = (sectionIndex, newLayout) => {
    setCustomSectionLayout(sectionIndex, newLayout);
    
    // 이미지가 있으면 새로운 레이아웃에 맞춰 다시 리사이징
    if (customMedia[sectionIndex] && customMedia[sectionIndex].type === 'image' && customMedia[sectionIndex].base64) {
      // 원본 이미지가 있으면 원본 사용, 없으면 현재 base64 사용
      const imageToResize = customMedia[sectionIndex].originalBase64 || customMedia[sectionIndex].base64;
      
      resizeImageForLayout(imageToResize, newLayout, (resizedBase64, resizedUrl) => {
        if (resizedBase64 && resizedUrl) {
          setCustomSectionMedia(sectionIndex, { 
            ...customMedia[sectionIndex],
            url: resizedUrl,
            base64: resizedBase64,
            // 원본 base64 유지
            originalBase64: customMedia[sectionIndex].originalBase64 || customMedia[sectionIndex].base64,
          });
        }
      });
    }
  };

  // 이미 업로드된 이미지를 현재 레이아웃에 맞춰 리사이징
  useEffect(() => {
    if (!customSections.length) return;
    
    console.log('useEffect 트리거: 이미지 리사이징 확인 시작');
    
    customSections.forEach((sectionIndex) => {
      if (customMedia[sectionIndex] && customMedia[sectionIndex].type === 'image' && customMedia[sectionIndex].base64) {
        const layout = getCustomSectionLayout(sectionIndex);
        // 원본 이미지가 있으면 원본 사용, 없으면 현재 base64 사용
        const imageToResize = customMedia[sectionIndex].originalBase64 || customMedia[sectionIndex].base64;
        
        let targetWidth = 128;
        let targetHeight = 768;
        
        if (layout === 'top-middle') {
          targetHeight = 698;
        } else if (layout === 'top-middle-bottom') {
          targetHeight = 560;
        } else {
          targetHeight = 768;
        }
        
        console.log(`섹션 ${sectionIndex} 레이아웃: ${layout}, 목표 크기: ${targetWidth}x${targetHeight}`);
        
        // 현재 표시 중인 이미지 크기 확인
        const currentImg = new Image();
        currentImg.onload = () => {
          console.log(`섹션 ${sectionIndex} 현재 이미지 크기: ${currentImg.width}x${currentImg.height}, 목표: ${targetWidth}x${targetHeight}`);
          
          // 이미지가 리사이징되지 않았거나 다른 크기면 리사이징
          if (Math.abs(currentImg.width - targetWidth) > 1 || Math.abs(currentImg.height - targetHeight) > 1) {
            console.log(`섹션 ${sectionIndex} 이미지 리사이징 필요: ${currentImg.width}x${currentImg.height} -> ${targetWidth}x${targetHeight}`);
            resizeImageForLayout(imageToResize, layout, (resizedBase64, resizedUrl) => {
              if (resizedBase64 && resizedUrl) {
                console.log(`섹션 ${sectionIndex} 이미지 리사이징 완료: ${targetWidth}x${targetHeight}`);
                setCustomSectionMedia(sectionIndex, { 
                  ...customMedia[sectionIndex],
                  url: resizedUrl,
                  base64: resizedBase64,
                  // 원본 base64 유지
                  originalBase64: customMedia[sectionIndex].originalBase64 || imageToResize,
                });
              } else {
                console.error(`섹션 ${sectionIndex} 이미지 리사이징 실패`);
              }
            });
          } else {
            console.log(`섹션 ${sectionIndex} 이미지 크기 확인: ${currentImg.width}x${currentImg.height} (정상)`);
          }
        };
        currentImg.onerror = () => {
          console.error(`이미지 로드 실패: 섹션 ${sectionIndex}`);
        };
        currentImg.src = customMedia[sectionIndex].base64; // 현재 표시 중인 이미지 크기 확인
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customSections.join(','), JSON.stringify(customSectionLayouts), Object.keys(customMedia).join(',')]);

  const handleRemoveSection = (index) => {
    removeCustomSection(index);
  };

  const handleToggleSectionActive = (index) => {
    if (activeSections.includes(index)) {
      // 비활성화
      if (activeSections.length <= 1) {
        alert("최소 하나의 섹션은 활성화되어 있어야 합니다.");
        return;
      }
      const newActiveSections = activeSections.filter((i) => i !== index);
      // sectionOrder가 있으면 그 순서를 유지
      let orderedNewActiveSections = newActiveSections;
      if (sectionOrder && sectionOrder.length > 0) {
        orderedNewActiveSections = sectionOrder.filter(section => newActiveSections.includes(section));
      }
      setActiveSections(orderedNewActiveSections);
      if (currentSection === index) {
        setCurrentSection(Math.min(...orderedNewActiveSections));
      }
    } else {
      // 활성화 (페이지 이동하지 않음)
      let newActiveSections = [...activeSections, index];
      // sectionOrder가 있으면 그 순서를 따르고, 없으면 sort() 사용
      if (sectionOrder && sectionOrder.length > 0) {
        newActiveSections = sectionOrder.filter(section => newActiveSections.includes(section));
      } else {
        newActiveSections.sort();
      }
      setActiveSections(newActiveSections);
      // setCurrentSection(index); // 제거: 활성화만 하고 페이지 이동하지 않음
    }
  };

  // 섹션 이름 매핑
  const getSectionName = (index) => {
    // 저장된 커스텀 이름이 있으면 우선 사용
    if (customSectionNames[index]) {
      return customSectionNames[index];
    }
    
    // 기본 섹션의 기본 이름
    const names = {
      0: "문구(1)",
      1: "문구(2)",
      2: "문구(3)",
      3: "수위데이터",
    };
    if (names[index] !== undefined) {
      return names[index];
    }
    
    // 커스텀 섹션의 기본 이름
    return getSectionNameFromHook(index);
  };

  // 모든 섹션 목록 (보호된 섹션 + 커스텀 섹션)
  const allSections = [...protectedSections, ...customSections].sort();
  
  // sectionOrder 초기화 (한 번만 실행)
  useEffect(() => {
    if (sectionOrder === null && allSections.length > 0) {
      // 기본 순서는 인덱스 순서(0,1,2,3,...)를 사용
      const initialOrder = [...allSections];
      setSectionOrder(initialOrder);
      localStorage.setItem('sectionOrder', JSON.stringify(initialOrder));
    }
  }, [sectionOrder, allSections, activeSections, protectedSections, customSections]);
  
  // 새로운 섹션이 추가되면 sectionOrder에 추가
  useEffect(() => {
    if (sectionOrder && customSections.length > 0) {
      const newSections = customSections.filter(section => !sectionOrder.includes(section));
      if (newSections.length > 0) {
        const updatedOrder = [...sectionOrder, ...newSections];
        setSectionOrder(updatedOrder);
        localStorage.setItem('sectionOrder', JSON.stringify(updatedOrder));
      }
    }
  }, [customSections, sectionOrder]);
  
  // 모든 섹션을 저장된 순서대로 표시
  const orderedActiveSections = useMemo(() => {
    if (!sectionOrder || sectionOrder.length === 0) {
      return [...allSections];
    }

    const validOrdered = sectionOrder.filter((section) =>
      allSections.includes(section)
    );
    const missingSections = allSections.filter(
      (section) => !validOrdered.includes(section)
    );
    return [...validOrdered, ...missingSections];
  }, [sectionOrder, allSections]);
  
  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    setIsDragging(false);
    setDragOverIndex(null);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setDragPosition({ x: e.clientX, y: e.clientY });
    draggedButtonRef.current = e.target;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.dropEffect = "move";
    e.dataTransfer.setData("text/plain", "");
    
    // 원본 버튼 투명하게
    e.target.style.opacity = "0.3";
    
    // 커스텀 드래그 이미지 생성 (마우스를 따라 움직이는 효과)
    const dragImage = e.target.cloneNode(true);
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    dragImage.style.opacity = "0.9";
    dragImage.style.transform = "rotate(3deg) scale(1.1)";
    dragImage.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.5)";
    dragImage.style.pointerEvents = "none";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };
  
  const handleDrag = (e) => {
    setDragPosition({ x: e.clientX, y: e.clientY });
    const deltaX = Math.abs(e.clientX - dragStartPos.current.x);
    const deltaY = Math.abs(e.clientY - dragStartPos.current.y);
    if (deltaX > 5 || deltaY > 5) {
      setIsDragging(true);
    }
  };
  
  const handleDragOver = (e, buttonIndex) => {
    e.preventDefault();
    e.stopPropagation(); // 컨테이너의 onDragOver와 충돌 방지
    e.dataTransfer.dropEffect = "move";
    e.dataTransfer.effectAllowed = "move";
    
    // 드롭 가능한 위치 표시
    if (draggedIndex !== null && draggedIndex !== buttonIndex) {
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX;
      const buttonCenterX = rect.left + rect.width / 2;
      
      // 마우스가 버튼의 왼쪽 절반에 있으면 앞에, 오른쪽 절반에 있으면 뒤에
      const position = mouseX < buttonCenterX ? 'before' : 'after';
      
      setDragOverIndex(buttonIndex);
      setDragOverPosition(position);
    }
  };
  
  const handleControlsDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    
    if (draggedIndex === null || !sectionControlsRef.current) return;
    
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // 모든 버튼의 위치 확인
    const buttons = sectionControlsRef.current.querySelectorAll('button');
    let foundIndex = null;
    let foundPosition = null;
    
    // 먼저 gap 영역 확인
    buttons.forEach((button, idx) => {
      if (idx === 0) return; // 첫 번째 버튼 앞에는 gap이 없음
      
      const buttonRect = button.getBoundingClientRect();
      const prevButton = buttons[idx - 1];
      const prevButtonRect = prevButton.getBoundingClientRect();
      
      const gapStart = prevButtonRect.right;
      const gapEnd = buttonRect.left;
      const gapWidth = gapEnd - gapStart;
      
      // gap 영역에 마우스가 있으면 (세로 범위도 확인, 약간의 여유 공간 추가)
      if (gapWidth > 0 && mouseX >= gapStart - 5 && mouseX <= gapEnd + 5 && 
          mouseY >= Math.min(prevButtonRect.top, buttonRect.top) - 10 && 
          mouseY <= Math.max(prevButtonRect.bottom, buttonRect.bottom) + 10) {
        foundIndex = idx;
        foundPosition = 'before';
        return;
      }
    });
    
    // gap 영역이 아니면 버튼 위 확인
    if (foundIndex === null) {
      buttons.forEach((button, idx) => {
        if (idx === draggedIndex) return;
        
        const buttonRect = button.getBoundingClientRect();
        const buttonLeft = buttonRect.left;
        const buttonRight = buttonRect.right;
        const buttonCenterX = buttonLeft + buttonRect.width / 2;
        
        // 버튼 위에 마우스가 있으면
        if (mouseX >= buttonLeft && mouseX <= buttonRight &&
            mouseY >= buttonRect.top && mouseY <= buttonRect.bottom) {
          foundIndex = idx;
          foundPosition = mouseX < buttonCenterX ? 'before' : 'after';
        }
      });
    }
    
    if (foundIndex !== null) {
      setDragOverIndex(foundIndex);
      setDragOverPosition(foundPosition);
    }
  };
  
  const handleControlsDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverIndex === null || draggedIndex === null) return;
    handleDrop(e, dragOverIndex);
  };
  
  const handleDragLeave = (e) => {
    // 다른 버튼으로 이동할 때만 인디케이터 제거
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
      setDragOverPosition(null);
    }
  };
  
  const handleDragEnd = (e) => {
    if (draggedButtonRef.current) {
      draggedButtonRef.current.style.opacity = "1";
    }
    setDraggedIndex(null);
    setIsDragging(false);
    setDragOverIndex(null);
    setDragOverPosition(null);
  };
  
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setIsDragging(false);
      setDragOverIndex(null);
      setDragOverPosition(null);
      return;
    }
    
    const newOrderedSections = [...orderedActiveSections];
    const draggedSection = newOrderedSections[draggedIndex];
    
    // 드롭 위치 계산
    let finalDropIndex = dropIndex;
    if (dragOverPosition === 'after') {
      // 버튼 뒤에 드롭하면 다음 위치
      finalDropIndex = dropIndex + 1;
    } else {
      // 버튼 앞에 드롭하면 현재 위치
      finalDropIndex = dropIndex;
    }
    
    // 배열에서 제거 후 삽입
    newOrderedSections.splice(draggedIndex, 1);
    
    // 삽입할 인덱스 조정 (제거된 항목이 삽입 위치보다 앞에 있으면 인덱스 감소)
    const insertIndex = draggedIndex < finalDropIndex ? finalDropIndex - 1 : finalDropIndex;
    newOrderedSections.splice(insertIndex, 0, draggedSection);
    
    // sectionOrder 업데이트 (모든 섹션의 순서 저장)
    setSectionOrder(newOrderedSections);
    localStorage.setItem('sectionOrder', JSON.stringify(newOrderedSections));
    
    // activeSections는 활성화된 섹션만 유지 (순서는 sectionOrder에서 관리)
    const newActiveSections = newOrderedSections.filter(section => activeSections.includes(section));
    setActiveSections(newActiveSections);
    
    setDraggedIndex(null);
    setIsDragging(false);
    setDragOverIndex(null);
    setDragOverPosition(null);
  };
  
  const handleButtonClick = (index) => {
    // 드래그 중이면 클릭 무시
    if (isDragging) {
      return;
    }
    toggleSection(index);
  };

  useEffect(() => {
    if (waterLevel > 0.25) {
      if (!activeSections.includes(3)) {
        setPreviousSections([...activeSections]);
        setActiveSections([3]);
        setCurrentSection(3);
      }
    } else if (waterLevel <= 0.25 && activeSections.includes(3)) {
      if (activeSections.length === 1) {
        setActiveSections([...previousSections]);
        setCurrentSection(previousSections[0]);
      } else {
        setActiveSections(activeSections.filter(section => section !== 3));
      }
    }
  }, [waterLevel, activeSections]);

  const getWaterButtonStyle = (index) => {
    const baseStyle = getButtonStyle(index);
    if (index === 3) {
      if (waterLevel > 0.25) {
        return {
          ...baseStyle,
          backgroundColor: "red",
          cursor: "pointer"
        };
      } else if (waterLevel === 0) {
        return {
          ...baseStyle,
          opacity: 0.5,
          cursor: "not-allowed"
        };
      }
    }
    return baseStyle;
  };

  return (
    <>
      <div className="banner">
        <div className="banner-left">
          <h1>LED Seoul</h1>
          <div className="divider"></div>
        </div>

        <div className="banner-mid">
          <button
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#offcanvasScrolling"
            aria-controls="offcanvasScrolling"
            style={{
              padding: "0.5rem",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "0.5rem",
              color: "#3b82f6",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
              e.target.style.color = "#3b82f6";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "#3b82f6";
            }}
          >
            <i className="fa-solid fa-cog" style={{ fontSize: "1.25rem" }}></i>
          </button>
        </div>

        <div
          className="offcanvas offcanvas-end settings-offcanvas-top"
          data-bs-scroll="true"
          data-bs-backdrop="false"
          tabIndex="-1"
          id="offcanvasScrolling"
          aria-labelledby="offcanvasScrollingLabel"
        >
          <div className="offcanvas-header">
            <div>
              <h5 className="offcanvas-title" id="offcanvasScrollingLabel" style={{ margin: 0 }}>
              설정
            </h5>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              data-bs-dismiss="offcanvas"
              aria-label="Close"
              style={{ opacity: 0.7 }}
            ></button>
          </div>
          <div className="offcanvas-body" style={{ padding: "0 1.5rem 1.5rem 1.5rem", scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <div className="section-management" style={{ maxHeight: "100%", overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
              
              {/* 위젯 설정 */}
              <section style={{ marginTop: "2rem", marginBottom: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.3em", margin: 0 }}>
                    위젯 설정
                  </h3>
                  <div style={{ height: "1px", flex: 1, margin: "0 1.5rem", backgroundColor: "rgba(59, 130, 246, 0.2)" }}></div>
                </div>
                <div className="glass-card" style={{ backgroundColor: "rgba(59, 130, 246, 0.06)", borderColor: "rgba(59, 130, 246, 0.2)", padding: "1.5rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
                    {/* 아날로그 시계 */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "1rem",
                      }}
                    >
                      <ClockThumbnail type="analog" />
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="clockType"
                          value="analog"
                          checked={clockType === 'analog'}
                          onChange={() => setClockType('analog')}
                          style={{
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                          }}
                        />
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>아날로그 시계</span>
                      </label>
                    </div>

                    {/* 아날로그 시계 2 */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "1rem",
                      }}
                    >
                      <img 
                        src="/images/아날로그시계2.png" 
                        alt="아날로그 시계 2"
                        style={{ 
                          width: "80px", 
                          height: "80px", 
                          objectFit: "contain",
                          imageRendering: "pixelated"
                        }} 
                      />
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="clockType"
                          value="analog2"
                          checked={clockType === 'analog2'}
                          onChange={() => setClockType('analog2')}
                          style={{
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                          }}
                        />
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>아날로그 시계 2</span>
                      </label>
                    </div>

                    {/* 디지털 시계 */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "1rem",
                      }}
                    >
                      <ClockThumbnail type="digital" />
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="clockType"
                          value="digital"
                          checked={clockType === 'digital'}
                          onChange={() => setClockType('digital')}
                          style={{
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                          }}
                        />
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>디지털 시계</span>
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              {/* 섹션 활성화/비활성화 */}
              <section style={{ marginTop: "0", marginBottom: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.3em", margin: 0 }}>
                    섹션 활성화
                  </h3>
                  <div style={{ height: "1px", flex: 1, margin: "0 1.5rem", backgroundColor: "rgba(59, 130, 246, 0.2)" }}></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
                  {orderedActiveSections.map((index) => {
                    const isWaterDataSection = index === 3;
                    const isEditingName = !isWaterDataSection && (editingStates[index]?.name || false);
                    const isEditingInterval = editingStates[index]?.interval || false;
                    const editName = editValues[index]?.name ?? getSectionName(index);  
                    const editInterval = editValues[index]?.interval ?? getSectionInterval(index) / 1000;
                    
                    const handleNameEdit = () => {
                      if (isWaterDataSection) return;
                      setEditingStates({ ...editingStates, [index]: { ...editingStates[index], name: true } });
                      setEditValues({ ...editValues, [index]: { ...editValues[index], name: getSectionName(index) } });
                    };
                    
                    const handleNameSave = () => {
                      setCustomSectionName(index, editName);
                      setEditingStates({ ...editingStates, [index]: { ...editingStates[index], name: false } });
                    };
                    
                    const handleNameCancel = () => {
                      setEditingStates({ ...editingStates, [index]: { ...editingStates[index], name: false } });
                      setEditValues({ ...editValues, [index]: { ...editValues[index], name: getSectionName(index) } });
                    };
                    
                    const handleIntervalEdit = () => {
                      setEditingStates({ ...editingStates, [index]: { ...editingStates[index], interval: true } });
                      setEditValues({ ...editValues, [index]: { ...editValues[index], interval: getSectionInterval(index) / 1000 } });
                    };
                    
                    const handleIntervalSave = () => {
                      setCustomSectionInterval(index, editInterval * 1000);
                      setEditingStates({ ...editingStates, [index]: { ...editingStates[index], interval: false } });
                    };
                    
                    const handleIntervalCancel = () => {
                      setEditingStates({ ...editingStates, [index]: { ...editingStates[index], interval: false } });
                      setEditValues({ ...editValues, [index]: { ...editValues[index], interval: getSectionInterval(index) / 1000 } });
                    };
                    
                    return (
                      <div
                        key={index}
                        className="glass-card"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "1.25rem",
                          padding: "1.5rem",
                          background: "rgba(59, 130, 246, 0.05)",
                          border: "1px solid rgba(59, 130, 246, 0.15)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
                            <div style={{ flex: 1 }}>
                              {isEditingName ? (
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditValues({ ...editValues, [index]: { ...editValues[index], name: e.target.value } })}
                                  onBlur={handleNameSave}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleNameSave();
                                    if (e.key === 'Escape') handleNameCancel();
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "0.5rem 0.75rem",
                                    fontSize: "1.125rem",
                                    fontWeight: 700,
                                    color: "#e2e8f0",
                                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                                    border: "1px solid rgba(59, 130, 246, 0.2)",
                                    borderRadius: "0.75rem",
                                    outline: "none",
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <h4 
                                  style={{ 
                                    fontSize: "1.125rem", 
                                    fontWeight: 700, 
                                    color: "#e2e8f0",
                                    margin: 0,
                                    cursor: isWaterDataSection ? "default" : "pointer",
                                  }}
                                  onClick={isWaterDataSection ? undefined : handleNameEdit}
                                  title={isWaterDataSection ? "수위데이터 이름은 고정입니다." : "클릭하여 이름 변경"}
                                >
                                  {getSectionName(index)}
                                </h4>
                              )}
                              {!isWaterDataSection &&
                                (isEditingInterval ? (
                                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.25rem" }}>
                                    <input
                                      type="number"
                                      value={editInterval}
                                      onChange={(e) => setEditValues({ ...editValues, [index]: { ...editValues[index], interval: Number(e.target.value) } })}
                                      onBlur={handleIntervalSave}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleIntervalSave();
                                        if (e.key === 'Escape') handleIntervalCancel();
                                      }}
                                      min="1"
                                      style={{
                                        width: "50px",
                                        padding: "0.25rem 0.5rem",
                                        fontSize: "12px",
                                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                                        border: "1px solid rgba(59, 130, 246, 0.2)",
                                        borderRadius: "0.5rem",
                                        color: "#cbd5e1",
                                        outline: "none",
                                      }}
                                      autoFocus
                                    />
                                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>초</span>
                                  </div>
                                ) : (
                                  <span 
                                    style={{ 
                                      fontSize: "15px", 
                                      color: "#cbd5e1",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                      marginTop: "0.25rem",
                                      cursor: "pointer",
                                      fontWeight: 500,
                                    }}
                                    onClick={handleIntervalEdit}
                                    title="클릭하여 인터벌 변경"
                                  >
                                    {getSectionInterval(index) / 1000}초 간격
                                  </span>
                                ))}
                            </div>
                          </div>
                          {!isWaterDataSection && (
                            <label className="toggle-switch" style={{ margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={activeSections.includes(index)}
                                onChange={() => handleToggleSectionActive(index)}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 섹션 추가 */}
              <section style={{ marginBottom: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.3em", margin: 0 }}>
                    새 섹션 추가
                  </h3>
                  <div style={{ height: "1px", flex: 1, margin: "0 1.5rem", backgroundColor: "rgba(59, 130, 246, 0.2)" }}></div>
                </div>
                <div className="glass-card" style={{ backgroundColor: "rgba(59, 130, 246, 0.06)", borderColor: "rgba(59, 130, 246, 0.2)", padding: "2rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", alignItems: "stretch" }}>
                    <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem", marginLeft: "0.25rem" }}>
                        섹션 이름
                      </label>
                      <input
                        type="text"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1.25rem",
                          fontSize: "1rem",
                          color: "#ffffff",
                          backgroundColor: "rgba(0, 0, 0, 0.3)",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          borderRadius: "0.75rem",
                          outline: "none",
                        }}
                        placeholder="섹션 이름 입력..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddSection();
                          }
                        }}
                      />
                    </div>
                    <div style={{ width: "160px" }}>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem", marginLeft: "0.25rem" }}>
                        간격 (초)
                      </label>
                      <input
                        type="number"
                        value={newSectionInterval}
                        onChange={(e) => setNewSectionInterval(Number(e.target.value))}
                        min="1"
                        style={{
                          width: "100%",
                          padding: "0.75rem 1.25rem",
                          fontSize: "1rem",
                          color: "#ffffff",
                          backgroundColor: "rgba(0, 0, 0, 0.3)",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          borderRadius: "0.75rem",
                          outline: "none",
                        }}
              />
            </div>
                    <button
                      onClick={handleAddSection}
                      disabled={isMaxSectionsReached}
                      style={{
                        height: "2.75rem",
                        padding: "0 2rem",
                        backgroundColor: isMaxSectionsReached ? "#475569" : "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: "0.75rem",
                        cursor: isMaxSectionsReached ? "not-allowed" : "pointer",
                        fontSize: "13px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        whiteSpace: "nowrap",
                        boxShadow: isMaxSectionsReached ? "none" : "0 10px 15px -3px rgba(37, 99, 235, 0.4)",
                        transition: "all 0.2s",
                        opacity: isMaxSectionsReached ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isMaxSectionsReached) {
                          e.target.style.backgroundColor = "#1d4ed8";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isMaxSectionsReached) {
                          e.target.style.backgroundColor = "#2563eb";
                        }
                      }}
                    >
                      섹션 생성
                    </button>
            </div>
          </div>
        </div>
              </section>

              {/* 커스텀 섹션 관리 */}
              {customSections.length > 0 && (
                <section style={{ marginBottom: "2.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                    <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.3em", margin: 0 }}>
                      커스텀 섹션 관리
                    </h3>
                    <div style={{ height: "1px", flex: 1, margin: "0 1.5rem", backgroundColor: "rgba(59, 130, 246, 0.2)" }}></div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {orderedActiveSections.filter(index => customSections.includes(index)).map((index) => (
                      <div
                        key={index}
                        className="glass-card"
                        style={{
                          padding: "1.75rem",
                          background: "rgba(59, 130, 246, 0.05)",
                          border: "1px solid rgba(59, 130, 246, 0.15)",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1.5rem" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flex: 1 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                                  <h4 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                                    {getSectionName(index)}
                                  </h4>
                                </div>
                                {customMedia[index] && customMedia[index].fileName && (
                                  <p style={{ 
                                    fontSize: "13px", 
                                    color: "#94a3b8", 
                                    margin: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    fontStyle: "italic"
                                  }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>link</span>
                                    {customMedia[index].fileName}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              <label style={{ position: "relative", display: "inline-block", cursor: "pointer" }}>
            <input
                                  type="file"
                                  accept="image/*,video/*"
                                  onChange={(e) => handleMediaChange(index, e)}
                                  style={{ display: "none" }}
                                  id={`media-input-${index}`}
                                />
                                <button
                                  onClick={() => document.getElementById(`media-input-${index}`).click()}
                                  style={{
                                    padding: "0.625rem",
                                    color: "#3b82f6",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    borderRadius: "0.5rem",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.color = "#60a5fa";
                                    e.target.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.color = "#3b82f6";
                                    e.target.style.backgroundColor = "transparent";
                                  }}
                                  title="미디어 변경"
                                >
                                  <span className="material-symbols-outlined">edit</span>
                                </button>
            </label>
                              <button
                                onClick={() => handleRemoveSection(index)}
                                style={{
                                  padding: "0.625rem",
                                  color: "rgba(239, 68, 68, 0.6)",
                                  backgroundColor: "transparent",
                                  border: "none",
                                  borderRadius: "0.5rem",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.color = "#ef4444";
                                  e.target.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.color = "rgba(239, 68, 68, 0.6)";
                                  e.target.style.backgroundColor = "transparent";
                                }}
                                title="섹션 제거"
                              >
                                <span className="material-symbols-outlined">delete</span>
                              </button>
                            </div>
                          </div>
                          {customMedia[index] && (
                            <div style={{ 
                              paddingTop: "1.5rem", 
                              borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "1rem"
                            }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                  <span style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: "0.25rem", 
                                    padding: "0.375rem 0.75rem", 
                                    backgroundColor: activeSections.includes(index) ? "rgba(16, 185, 129, 0.05)" : "rgba(245, 158, 11, 0.05)", 
                                    borderRadius: "0.5rem", 
                                    border: activeSections.includes(index) ? "1px solid rgba(16, 185, 129, 0.1)" : "1px solid rgba(245, 158, 11, 0.1)",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    color: activeSections.includes(index) ? "#10b981" : "#f59e0b",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em"
                                  }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                                      {activeSections.includes(index) ? "check_circle" : "pause_circle"}
                                    </span>
                                    {activeSections.includes(index) ? "활성" : "대기중"}
                                  </span>
                                </div>
                              </div>
                              
                              {/* 레이아웃 선택 */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                <label style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", marginBottom: "0.25rem" }}>
                                  레이아웃
                                </label>
                                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                                  <label style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: "0.5rem", 
                                    padding: "0.5rem 1rem",
                                    borderRadius: "0.5rem",
                                    cursor: "pointer",
                                    backgroundColor: getCustomSectionLayout(index) === 'top-middle-bottom' ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.05)",
                                    border: getCustomSectionLayout(index) === 'top-middle-bottom' ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                                    transition: "all 0.2s",
                                  }}>
                                    <input
                                      type="radio"
                                      name={`layout-${index}`}
                                      value="top-middle-bottom"
                                      checked={getCustomSectionLayout(index) === 'top-middle-bottom'}
                                      onChange={() => handleLayoutChange(index, 'top-middle-bottom')}
                                      style={{ margin: 0, cursor: "pointer" }}
                                    />
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                      <span style={{ fontSize: "12px", color: "#e2e8f0" }}>로고+시계+이미지</span>
                                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>이미지 크기: 128x560</span>
                                    </div>
                                  </label>
                                  
                                  <label style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: "0.5rem", 
                                    padding: "0.5rem 1rem",
                                    borderRadius: "0.5rem",
                                    cursor: "pointer",
                                    backgroundColor: getCustomSectionLayout(index) === 'top-middle' ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.05)",
                                    border: getCustomSectionLayout(index) === 'top-middle' ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                                    transition: "all 0.2s",
                                  }}>
                                    <input
                                      type="radio"
                                      name={`layout-${index}`}
                                      value="top-middle"
                                      checked={getCustomSectionLayout(index) === 'top-middle'}
                                      onChange={() => handleLayoutChange(index, 'top-middle')}
                                      style={{ margin: 0, cursor: "pointer" }}
                                    />
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                      <span style={{ fontSize: "12px", color: "#e2e8f0" }}>로고+이미지</span>
                                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>이미지 크기: 128x698</span>
                                    </div>
                                  </label>
                                  
                                  <label style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: "0.5rem", 
                                    padding: "0.5rem 1rem",
                                    borderRadius: "0.5rem",
                                    cursor: "pointer",
                                    backgroundColor: getCustomSectionLayout(index) === 'middle' ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.05)",
                                    border: getCustomSectionLayout(index) === 'middle' ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                                    transition: "all 0.2s",
                                  }}>
                                    <input
                                      type="radio"
                                      name={`layout-${index}`}
                                      value="middle"
                                      checked={getCustomSectionLayout(index) === 'middle'}
                                      onChange={() => handleLayoutChange(index, 'middle')}
                                      style={{ margin: 0, cursor: "pointer" }}
                                    />
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                      <span style={{ fontSize: "12px", color: "#e2e8f0" }}>이미지</span>
                                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>이미지 크기: 128x768</span>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>

      <Logo34PairProvider>
        <div className="main-page">
          <div className="container">
            {sections.top}

            {sections.middle}

            {sections.bottom}
          </div>
        </div>
      </Logo34PairProvider>

      <div 
        className="section-controls"
        ref={sectionControlsRef}
        onDragOver={handleControlsDragOver}
        onDrop={handleControlsDrop}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragLeave={(e) => {
          // 컨테이너 밖으로 완전히 나간 경우에만 인디케이터 제거
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseX = e.clientX;
          const mouseY = e.clientY;
          if (mouseX < rect.left || mouseX > rect.right || mouseY < rect.top || mouseY > rect.bottom) {
            setDragOverIndex(null);
            setDragOverPosition(null);
          }
        }}
        style={{ 
          WebkitUserSelect: "none",
          userSelect: "none"
        }}
      >
        {orderedActiveSections.map((index, buttonIndex) => (
          <React.Fragment key={index}>
            {dragOverIndex === buttonIndex && draggedIndex !== null && dragOverPosition === 'before' && (
              <div
                style={{
                  width: "3px",
                  height: "70%",
                  backgroundColor: "#3b82f6",
                  borderRadius: "2px",
                  margin: "0 3px",
                  boxShadow: "0 0 10px rgba(59, 130, 246, 0.9)",
                  flexShrink: 0,
                }}
              />
            )}
            <button
              draggable
              onDragStart={(e) => handleDragStart(e, buttonIndex)}
              onDrag={handleDrag}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => handleDragOver(e, buttonIndex)}
              onDragLeave={handleDragLeave}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, buttonIndex)}
              style={{
                ...(index === 0 || index === 1 || index === 2 || index === 3 
                  ? getWaterButtonStyle(index) 
                  : getButtonStyle(index)),
                cursor: "grab",
                opacity: draggedIndex === buttonIndex ? 0.3 : 1,
                position: "relative",
                transition: draggedIndex === null ? "all 0.2s" : "none",
                zIndex: draggedIndex === buttonIndex ? 1000 : 1,
              }}
              onClick={() => handleButtonClick(index)}
              onMouseDown={(e) => {
                if (e.button === 0) {
                  e.currentTarget.style.cursor = "grabbing";
                }
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.cursor = "grab";
              }}
            >
              {getSectionName(index)}
        </button>
            {dragOverIndex === buttonIndex && draggedIndex !== null && dragOverPosition === 'after' && (
              <div
                style={{
                  width: "3px",
                  height: "70%",
                  backgroundColor: "#3b82f6",
                  borderRadius: "2px",
                  margin: "0 3px",
                  boxShadow: "0 0 10px rgba(59, 130, 246, 0.9)",
                  flexShrink: 0,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

export default App;
