/** LED 패널 해상도(px). 128×768 → 128×256 (세로 1/3) 축소 */
export const LED_WIDTH = 128;
export const LED_HEIGHT = 256;

/**
 * LED 패널 화면 고정 좌표(px) 기본값 — 현장 LED 송출 캡처 위치에 맞춘 값.
 * LED 송출 프로그램은 화면 좌표를 고정으로 잘라 가므로, 창 높이(작업표시줄·ViPlex 표시 여부)와
 * 관계없이 이 자리에 고정. 현장마다 다르면 설정 화면 "LED 위치"에서 조정.
 */
export const LED_DEFAULT_POSITION = { left: 50, top: 183 };

/** 커스텀 섹션 "로고 표시"를 켰을 때 위쪽 로고 자리 (위 여백 8 + 로고 42) */
export const LOGO_AREA_HEIGHT = 50;

/** 커스텀 섹션 이미지/영상 높이 — 로고를 켜면 로고 자리만큼 줄어듦 (128×206) */
export const getMediaHeight = (hasLogo) => (hasLogo ? LED_HEIGHT - LOGO_AREA_HEIGHT : LED_HEIGHT);
