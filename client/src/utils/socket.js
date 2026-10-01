import io from "socket.io-client";
import { getSocketUrl } from "./socketUrl";

/** 앱 전체가 함께 쓰는 Socket.IO 연결 (악취 상태, 날씨) */
export const socket = io(getSocketUrl(), {
  transports: ["websocket"],
});
