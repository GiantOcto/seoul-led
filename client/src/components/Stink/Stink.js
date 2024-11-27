import { useEffect, useState } from "react";
import io from "socket.io-client";
import "./Stink.css";

const socket = io("http://localhost:8000", {
  transports: ["websocket"],
});

function StinkRunning() {
  return (
    <div className="stink-data-running">
    <h1>악&nbsp;&nbsp;&nbsp;&nbsp;취</h1>
    <img src="/images/회전화살표.png" alt="작동중"/>
    <h2>작동중</h2>
  </div>
  );
}

function StinkGood() {
  return (
    <div className="stink-data-good">
      <h1>악&nbsp;&nbsp;&nbsp;&nbsp;취</h1>
      <img src="/images/쾌적.png" alt="쾌적"/>
      <h2>쾌 적</h2>
    </div>
  );
}

function Stink({ id }) {
  const [machineStatus, setMachineStatus] = useState(0);

  useEffect(() => {
    socket.on("initial_data", (data) => {
      if (data && data.length > 0) {
        setMachineStatus(data[data.length - 1].machine_status);
      }
    });

    socket.on("new_data", (data) => {
      setMachineStatus(data.machine_status);
    });

    return () => {
      socket.off("initial_data");
      socket.off("new_data");
    };
  }, []);

  return (
    <div id={id}>
      {machineStatus === 1 ? <StinkRunning /> : <StinkGood />}
    </div>
  );
}

export default Stink;
