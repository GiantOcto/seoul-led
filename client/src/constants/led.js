/** LED 패널 해상도(px) */
export const LED_WIDTH = 128;
export const LED_HEIGHT = 768;

/**
 * LED 패널 화면 고정 좌표(px) 기본값 — 현장 LED 송출 캡처 위치에 맞춘 값.
 * LED 송출 프로그램은 화면 좌표를 고정으로 잘라 가므로, 창 높이(작업표시줄·ViPlex 표시 여부)와
 * 관계없이 이 자리에 고정. 현장마다 다르면 설정 화면 "LED 위치"에서 조정.
 */
export const LED_DEFAULT_POSITION = { left: 50, top: 183 };

/**
 * 커스텀 섹션 "로고 + 시계 + 미디어" 레이아웃의 위쪽 시계 칸 (로고 50 + 시계 패널 158).
 * 아래 이미지/영상은 나머지 128×560 (성남 원본과 같은 크기). 날씨까지 넣으려면 256 이 필요.
 */
export const CLOCK_BLOCK_HEIGHT = 208;
