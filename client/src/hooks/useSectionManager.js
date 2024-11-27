import { useState, useEffect } from "react";
import Event from "../components/Event/Event";
import { Logo1, Logo2 } from "../components/Logo/Logo";
import Clock from "../components/Clock/Clock";
import Weather from "../components/Weather/Weather";
import Stink from "../components/Stink/Stink";
import WaterLevel from "../components/WaterLevel/WaterLevel";

const INTERVALS = [3000, 3000, 3000, 3000];

export const useSectionManager = (initialDistrict = "강남구") => {
  const [selectedDistrict, setSelectedDistrict] = useState(initialDistrict);
  const [selectedClockStyle, setSelectedClockStyle] = useState("아날로그");
  const [currentSection, setCurrentSection] = useState(0);
  const [activeSections, setActiveSections] = useState([0, 1, 2, 3]);

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
        <Logo1 />
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
        <Logo2 id="logo2-page2" />
        <div className="air-quality">
          <div className="air-quality-text">
            <h1>{selectedDistrict}</h1>
            <p>오늘의 대기질</p>
          </div>

          <Weather selectedDistrict={selectedDistrict} />
          <Stink id="stink-data-page2"/>
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
        <h1>{selectedDistrict}</h1>
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
       <Logo2 />
        <h1>{selectedDistrict}</h1>
        <Clock />
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
        <p>text</p>
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
       <img src="/images/홍보문구.png" alt="middle1" />
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
      >
      </div>,
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
        <WaterLevel />
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
        <div className="slogan">
          <img src={`/images/slogans/${selectedDistrict}.png`} alt="slogan" />
        </div>
        <span style={{color: 'white'}}>NEWS</span>
        <Event selectedDistrict={selectedDistrict} />
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
        <p>text</p>
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
      >
          <Stink/>
      </div>,
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
          <p>다른 도로로<br/>우회하세요</p>
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
        <Stink/>
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
        <p>text</p>
      </div>,
    ],
  };

  const toggleSection = (index) => {
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
    selectedClockStyle,
    setSelectedClockStyle,
    toggleSection,
    getButtonStyle,
    sections,
    activeSections,
  };
};
