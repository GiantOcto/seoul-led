import { useState, useEffect } from "react";
import Event from "../components/Event/Event";
import { Logo1, Logo2, Logo3, Logo4 } from "../components/Logo/Logo";
import Clock from "../components/Clock/Clock";
import Weather from "../components/Weather/Weather";
import Stink from "../components/Stink/Stink";
import WaterLevel from "../components/WaterLevel/WaterLevel";

const INTERVALS = [30000, 20000, 20000, 20000, 20000];

export const useSectionManager = (
  initialDistrict = "서초구",
  onWaterLevelChange,
  waterLevel
) => {
  const [selectedDistrict, setSelectedDistrict] = useState(initialDistrict);
  const [currentSection, setCurrentSection] = useState(0);
  const [activeSections, setActiveSections] = useState([0, 1, 2, 3, 4]);
  const [weatherData, setWeatherData] = useState({
    pm10Grade: "좋음",
    pm2_5Grade: "좋음",
  });
  const [machineStatus, setMachineStatus] = useState(false);
  const [showLogo1, setShowLogo1] = useState(true);
  const [showLogo3, setShowLogo3] = useState(true);

  useEffect(() => {
    if (activeSections.length === 0) return;

    const showNextContainer = () => {
      const currentIdx = activeSections.indexOf(currentSection);
      const nextIdx = (currentIdx + 1) % activeSections.length;
      setCurrentSection(activeSections[nextIdx]);
    };

    const timer = setTimeout(showNextContainer, INTERVALS[currentSection]);
    return () => clearTimeout(timer);
  }, [currentSection, activeSections]);

  useEffect(() => {
    const interval1 = setInterval(() => {
      setShowLogo1((prev) => !prev);
    }, 15000);

    const interval2 = setInterval(() => {
      setShowLogo3((prev) => !prev);
    }, 15000);

    return () => {
      clearInterval(interval1);
      clearInterval(interval2);
    };
  }, []);

  const sections = {
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
        {showLogo1 ? <Logo1 /> : <Logo2 />}
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
        {showLogo3 ? (
          <div className="logo-transition">
            <Logo3/>
          </div>
        ) : (
          <div className="logo-transition">
            <Logo4/>
          </div>
        )}
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
        <Logo2 />
        <Clock />
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
        {showLogo3 ? (
          <div className="logo-transition">
            <Logo3 selectedDistrict={selectedDistrict} />
          </div>
        ) : (
          <div className="logo-transition">
            <Logo4 selectedDistrict={selectedDistrict} />
          </div>
        )}
        <Clock />
        <span style={{ color: "white" }}>NEWS</span>
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
        {showLogo1 ? <Logo1 /> : <Logo2 />}
        <Clock />
        <span style={{ color: "white" }}>NEWS</span>
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
        <div
          className="promotion-text"
          style={{
            width: "90%",
            position: "absolute",
            top: "24%",
            left: "55%",
            transform: "translate(-50%, -50%)",
            display: "inline-block",
            justifyContent: "center",
            alignItems: "center",
            color: "#E9BC35", 
            zIndex: "1000",
            fontFamily: "SeoulHangangEB",
            fontSize: "14px",
            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
          }}
        >
          <p>환경신기술 제 466호</p>
        </div>

        <img
          src="/images/홍보문구.png"
          alt="middle1"
          style={{ width: "100%", height: "100%", marginTop: "25%" }}
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
        <WaterLevel onWaterLevelChange={onWaterLevelChange} />
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
          position="middle4"
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
        <Event
          key="middle5-event"
          selectedDistrict={selectedDistrict}
          position="middle5"
        />
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
        <div className="water-level-warning">
          <p>
            다른 도로로
            <br />
            우회하세요
          </p>
          <img src="/images/우회 화살표.png" alt="우회 화살표" />
        </div>
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
          position="bottom4"
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
        <Event
          key="bottom5-event"
          selectedDistrict={selectedDistrict}
          position="bottom5"
        />
      </div>,
    ],
  };

  const toggleSection = (index) => {
    if (index === 2 && waterLevel < 2) {
      return;
    }

    if (activeSections.includes(index)) {
      if (activeSections.length > 1) {
        setActiveSections(activeSections.filter((i) => i !== index));
        if (currentSection === index) {
          const nextSection = activeSections.find((i) => i !== index);
          setCurrentSection(nextSection);
        }
      }
    } else {
      setActiveSections([...activeSections, index].sort());
      setCurrentSection(index);
    }
  };

  const getButtonStyle = (index) => ({
    backgroundColor:
      currentSection === index
        ? "coral"
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
    setCurrentSection,
    machineStatus,
    setMachineStatus,
  };
};