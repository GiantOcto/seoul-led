import { useEffect, useState } from "react";
import { socket } from "../../utils/socket";

// 서버가 접속 직후 한 번 + 10분마다 보내는 날씨. 시계가 나중에 켜져도 바로 보이도록 마지막 값을 기억
let latestWeather = null;
socket.on("weather_update", (data) => {
  latestWeather = data;
});

/** { temp, sky: "clear"|"partly"|"cloudy"|"rain"|"snow", pop } 또는 null (키 미설정·조회 전) */
export function useWeather() {
  const [weather, setWeather] = useState(latestWeather);

  useEffect(() => {
    const handleUpdate = (data) => setWeather(data);
    socket.on("weather_update", handleUpdate);
    return () => {
      socket.off("weather_update", handleUpdate);
    };
  }, []);

  return weather;
}
