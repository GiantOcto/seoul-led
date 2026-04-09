import React, { useEffect, useRef, useState } from "react";
import lottie from "lottie-web";
import io from "socket.io-client";
import { getSocketUrl } from "../../utils/socketUrl";
import "./Stink.css";

const socket = io(getSocketUrl(), {
  transports: ["websocket"],
});

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
          width: "100px",
          height: "100px",
        }}
      />
      <h2>저감중</h2>
    </div>
  );
}

function Stink({ id, onStatusChange = () => {} }) {
  const [isReducing, setIsReducing] = useState(false);

  useEffect(() => {
    socket.on("relay_reduction_status", (data) => {
      const next = Boolean(data?.reducing);
      setIsReducing(next);
      if (onStatusChange) onStatusChange(next);
    });

    return () => {
      socket.off("relay_reduction_status");
    };
  }, [onStatusChange]);

  return (
    <div id={id}>{isReducing ? <StinkRunning /> : <StinkGood />}</div>
  );
}

export default Stink;