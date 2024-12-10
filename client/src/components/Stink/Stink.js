import React, { useEffect, useRef, useState } from "react";
import lottie from "lottie-web";
import io from "socket.io-client";
import "./Stink.css";

const socket = io("http://localhost:8000", {
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
          width: "110px",
          height: "110px",
        }}
      />
      <h2>저감중</h2>
    </div>
  );
}

function Stink({ id, onStatusChange = () => {} }) {
  const [machineStatus, setMachineStatus] = useState(0);
  const container = useRef(null);

  useEffect(() => {
    socket.on("initial_data", (data) => {
      if (data && data.length > 0) {
        const status = data[data.length - 1].machine_status;
        setMachineStatus(status);
        if (onStatusChange) onStatusChange(status);
      }
    });

    socket.on("new_data", (data) => {
      setMachineStatus(data.machine_status);
      if (onStatusChange) onStatusChange(data.machine_status);
    });

    return () => {
      socket.off("initial_data");
      socket.off("new_data");
    };
  }, [onStatusChange]);

  return (
    <div id={id}>{machineStatus === true ? <StinkRunning /> : <StinkGood />}</div>
  );
}

export default Stink;
