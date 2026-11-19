// 헤더 버튼 아이콘 그림 — public/images 가 아니라 여기 두고 import 해서 씀.
// 이 프로그램은 한 번 받은 그림을 화면 쪽에 저장해 두고 계속 그걸 보여 줘서 (public/service-worker.js 의 그림 캐시),
// 파일 이름이 같은 채로 그림만 바꾸면 현장 화면엔 예전 아이콘이 그대로 나옴 (2026-11-17 포항에서 겪음).
// import 한 그림은 빌드할 때 파일 이름에 내용 해시가 붙거나 JS 안에 들어가서, 그림을 바꾸면 주소도 같이 바뀜.
// 원본은 chiila/AI parking iss 폴더의 ico 파일 — 가장 큰 그림을 꺼내 투명 여백을 잘라 PNG 로 넣음
import viplex from "./viplex.png";
import novalct from "./novalct.png";
import led from "./led.png";
import windows from "./windows.png";
import reboot from "./reboot.png";
import relay from "./relay.png";
import resolution from "./resolution.png";
import exit from "./exit.png";

export const HEADER_ICONS = { viplex, novalct, led, windows, reboot, relay, resolution, exit };
