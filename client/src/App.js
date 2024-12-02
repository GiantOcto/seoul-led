import React, { useState, useEffect } from "react";
import DistrictSelector from "./components/DistrictSelector/DistrictSelector";
import { useSectionManager } from "./hooks/useSectionManager";
import { useDarkMode } from "./hooks/useDarkMode";
import WaterLevel from "./components/WaterLevel/WaterLevel";
import "./App.css";

function App() {
  const {
    selectedDistrict,
    setSelectedDistrict,
    toggleSection,
    getButtonStyle,
    sections,
    activeSections,
  } = useSectionManager();

  const { isDarkMode, setIsDarkMode } = useDarkMode();

  const [waterLevel, setWaterLevel] = useState(0);

  const handleDistrictChange = (district) => {
    setSelectedDistrict(district);
  };

  const handleWaterLevelChange = (level) => {
    setWaterLevel(level);
  };

  useEffect(() => {
    if (waterLevel >= 1 && !activeSections.includes(2)) {
      toggleSection(2);  // 수위가 1 이상일 때 강제로 활성화
    } else if (waterLevel === 0 && activeSections.includes(2)) {
      toggleSection(2);  // 수위가 0일 때 강제로 비활성화
    }
  }, [waterLevel, activeSections, toggleSection]);

  const getWaterButtonStyle = (index) => {
    const baseStyle = getButtonStyle(index);
    if (index === 2) {
      if (waterLevel >= 1) {
        return {
          ...baseStyle,
          backgroundColor: "red",
          cursor: "pointer"  // 활성화 상태일 때 커서
        };
      } else if (waterLevel === 0) {
        return {
          ...baseStyle,
          opacity: 0.5,
          cursor: "not-allowed"  // 비활성화 상태일 때 커서
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
        </div>

        <div className="banner-mid">
          <button
            className="btn"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#offcanvasScrolling"
            aria-controls="offcanvasScrolling"
          >
            <i className="fa-solid fa-gear"></i>
          </button>
        </div>

        <div
          className="offcanvas offcanvas-end"
          data-bs-scroll="true"
          data-bs-backdrop="false"
          tabIndex="-1"
          id="offcanvasScrolling"
          aria-labelledby="offcanvasScrollingLabel"
        >
          <div className="offcanvas-header">
            <h5 className="offcanvas-title" id="offcanvasScrollingLabel">
              설정
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="offcanvas"
              aria-label="Close"
            ></button>
          </div>
          <div className="offcanvas-body">
            <div className="district-selector">
              <DistrictSelector
                selectedDistrict={selectedDistrict}
                onDistrictChange={handleDistrictChange}
              />
            </div>
          </div>
        </div>

        <div className="banner-right">
          <div className="position-absolute mb-1 form-check form-switch form-check-reverse">
            <input
              className="form-check-input"
              onChange={() => setIsDarkMode(!isDarkMode)}
              type="checkbox"
              id="flexSwitchCheckReverse"
              checked={isDarkMode}
            />
            <label
              className="form-check-label"
              htmlFor="flexSwitchCheckReverse"
            >
              <i className="fa-solid fa-moon" id="moon"></i>
            </label>
          </div>
        </div>
      </div>

      <div className="main-page">
        <div className="container">
          {sections.top}

          {sections.middle}

          {sections.bottom}
        </div>
      </div>

      <div className="section-controls">
        <button style={getWaterButtonStyle(0)} onClick={() => toggleSection(0)}>
          문구
        </button>
        <button style={getWaterButtonStyle(1)} onClick={() => toggleSection(1)}>
          미세먼지 및 오존
        </button>
        <button style={getWaterButtonStyle(2)} onClick={() => toggleSection(2)}>
          수위데이터
        </button>
        <button style={getWaterButtonStyle(3)} onClick={() => toggleSection(3)}>
          구 이벤트
        </button>
        <button style={getWaterButtonStyle(4)} onClick={() => toggleSection(4)}>
          전체 이벤트
        </button>
      </div>
      {activeSections.includes(2) && (
        <WaterLevel onWaterLevelChange={handleWaterLevelChange} />
      )}
    </>
  );
}

export default App;
