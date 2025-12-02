import React, { useEffect, useRef, useState } from "react";
import lottie from "lottie-web";
import { getSensorData } from "../../services/relayApi";
import "./Stink.css";

function StinkGood() {
  return (
    <div className="stink-data-good">
      <h1>악&nbsp;&nbsp;&nbsp;&nbsp;취</h1>
      <div className="stink-images">
        <img src="/images/좋음 - 눈.svg" alt="쾌적" className="stink-image-back" />
        <img src="/images/좋음 - 얼굴.svg" alt="쾌적" className="stink-image-front" />
      </div>
      <h2>저감완료</h2>
    </div>
  );
}

function StinkRunning() {
  const container = useRef(null);

  useEffect(() => {
    const anim = lottie.loadAnimation({
      container: container.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: "/images/fan.json",
    });

    return () => anim.destroy();
  }, []);

  return (
    <div className="stink-data-running">
      <h1>악&nbsp;&nbsp;&nbsp;&nbsp;취</h1>
      <div
        ref={container}
        style={{
          position: "relative",
          bottom: "5px",
          left: "5px",
          width: "110px",
          height: "110px",
        }}
      />
      <h2>저감중</h2>
    </div>
  );
}

function Stink({ id, onStatusChange = () => {} }) {
  const [relay4Status, setRelay4Status] = useState(false);
  const container = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getSensorData();
        const status = data?.relay4Status || false;
        setRelay4Status(status);
        if (onStatusChange) onStatusChange(status);
      } catch (err) {
        console.error("릴레이 상태 가져오기 실패:", err);
      }
    };

    // 초기 데이터 로드
    fetchData();

    // 2초마다 데이터 갱신 (RelayWebApi의 백그라운드 서비스와 동기화)
    const interval = setInterval(fetchData, 2000);

    return () => clearInterval(interval);
  }, [onStatusChange]);

  return (
    <div id={id}>{relay4Status === true ? <StinkRunning /> : <StinkGood />}</div>
  );
}

export default Stink;
