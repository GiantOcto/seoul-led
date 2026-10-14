import { useEffect, useState } from "react";

const TICK_MS = 1000;

/** 1초마다 현재 시각 갱신 (탭이 숨겨지면 멈춤) */
export function useNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let intervalId = null;

    const tick = () => setNow(new Date());

    const start = () => {
      tick();
      intervalId = setInterval(tick, TICK_MS);
    };

    const stop = () => {
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return now;
}
