import { useState, useEffect } from "react";
import Event from "../components/Event/Event";
import News from "../components/News/News";
import AmberAlert from "../components/Missing/Missing";

const DEFAULT_INTERVALS = [15000, 27000, 15000, 15000, 3000];

export const useSectionManager = (initialDistrict = "강남구") => {
  const [selectedDistrict, setSelectedDistrict] = useState(initialDistrict);
  const [selectedClockStyle, setSelectedClockStyle] = useState('analog');
  const [currentBottomIndex, setCurrentBottomIndex] = useState(0);
  const [activeSections, setActiveSections] = useState([0, 1, 2, 3]);
  const [newsKeyword, setNewsKeyword] = useState(() => {
    return localStorage.getItem("newsKeyword") || "서울";
  });
  const [intervals, setIntervals] = useState(() => {
    const savedIntervals = localStorage.getItem('sectionIntervals');
    return savedIntervals ? JSON.parse(savedIntervals) : DEFAULT_INTERVALS;
  });

  useEffect(() => {
    if (activeSections.length === 0) return;

    const showNextContainer = () => {
      setCurrentBottomIndex((prev) => {
        const currentIdx = activeSections.indexOf(prev);
        const nextIdx = (currentIdx + 1) % activeSections.length;
        return activeSections[nextIdx];
      });
    };

    const timer = setTimeout(showNextContainer, intervals[currentBottomIndex]);
    return () => clearTimeout(timer);
  }, [currentBottomIndex, activeSections, intervals]);

  const toggleSection = (index) => {
    setActiveSections((prev) => {
      if (prev.includes(index)) {
        const newSections = prev.filter((i) => i !== index);
        if (index === currentBottomIndex && newSections.length > 0) {
          setCurrentBottomIndex(newSections[0]);
        }
        return newSections;
      } else {
        return [...prev, index].sort();
      }
    });
  };

  const getButtonStyle = (index) => ({
    backgroundColor:
      currentBottomIndex === index
        ? "coral"
        : activeSections.includes(index)
        ? "#666"
        : "#333",
    opacity: activeSections.includes(index) ? 1 : 0.5,
  });

  const sectionBottom = [
    <div
      key="bottom1"
      className="section-bottom"
      id="bottom1"
      style={{ display: currentBottomIndex === 0 ? "block" : "none" }}
    >
      <Event selectedDistrict={selectedDistrict} />
    </div>,
    <div
      key="bottom2"
      className="section-bottom"
      id="bottom2"
      style={{ display: currentBottomIndex === 1 ? "block" : "none" }}
    >
      <video src="/videos/asdf.mp4" autoPlay loop muted />
    </div>,
    <div
      key={`bottom3-container-${newsKeyword}`}
      className="section-bottom"
      id="bottom3"
      style={{ display: currentBottomIndex === 2 ? "block" : "none" }}
    >
      <News key={`news-content-${newsKeyword}`} keyword={newsKeyword} />
    </div>,
    <div
      key="bottom4"
      className="section-bottom"
      id="bottom4"
      style={{ display: currentBottomIndex === 3 ? "block" : "none" }}
    >
      <AmberAlert />
    </div>,
    <div
      key="bottom5"
      className="section-bottom"
      id="bottom5"
      style={{ display: currentBottomIndex === 4 ? "block" : "none" }}
    >
      <p>text</p>
    </div>,
  ];

  const updateInterval = (index, newValue) => {
    const newIntervals = [...intervals];
    newIntervals[index] = newValue * 1000; // 초 단위를 밀리초로 변환
    setIntervals(newIntervals);
    localStorage.setItem('sectionIntervals', JSON.stringify(newIntervals));
  };

  return {
    selectedDistrict,
    setSelectedDistrict,
    selectedClockStyle,
    setSelectedClockStyle,
    toggleSection,
    getButtonStyle,
    sectionBottom,
    activeSections,
    newsKeyword,
    setNewsKeyword,
    intervals,
    updateInterval,
  };
};
