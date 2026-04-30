import io from "socket.io-client";
import { getSocketUrl } from "./socketUrl";

/** 수위·센서용 단일 Socket.io 연결 (WaterLevel / WaterLevelSensorsPanel 공유) */
export const waterLevelSocket = io(getSocketUrl(), {
  transports: ["websocket"],
});
