import Clock from "./components/Clock/Clock";
import Weather from "./components/Weather/Weather";
import Logo from "./components/Logo/Logo";
import DistrictSelector from "./components/DistrictSelector/DistrictSelector";
import ClockSelector from "./components/ClockSelector/ClockSelector";
import { useSectionManager } from "./hooks/useSectionManager";
import { useDarkMode } from "./hooks/useDarkMode";
import "./App.css";

function App() {
  const {
    selectedDistrict,
    setSelectedDistrict,
    selectedClockStyle,     
    setSelectedClockStyle,  
    toggleSection,
    getButtonStyle,
    sectionBottom
  } = useSectionManager();

  const { isDarkMode, setIsDarkMode } = useDarkMode();

  const handleDistrictChange = (district) => {
    setSelectedDistrict(district);
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

            <div className="clock-selector">
              <ClockSelector
                selectedClockStyle={selectedClockStyle}
                onClockstyleChange={setSelectedClockStyle}
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
          <div className="section-top">
            <Logo />
            <Clock />
          </div>

          <div className="section-middle">
            <div className="video-container">
              <div className="mid">
                <div className="mid-box">
                  <Weather selectedDistrict={selectedDistrict} />
                </div>
              </div>
            </div>
          </div>

          {sectionBottom}
        </div>
      </div>

      <div className="section-controls">
        <button style={getButtonStyle(0)} onClick={() => toggleSection(0)}>
          Event 
        </button>
        <button style={getButtonStyle(1)} onClick={() => toggleSection(1)}>
          Video 
        </button>
        <button style={getButtonStyle(2)} onClick={() => toggleSection(2)}>
          Section 3 
        </button>
        <button style={getButtonStyle(3)} onClick={() => toggleSection(3)}>
          Section 4 
        </button>
        <button style={getButtonStyle(4)} onClick={() => toggleSection(4)}>
          Section 5 
        </button>
      </div>
    </>
  );
}

export default App;
