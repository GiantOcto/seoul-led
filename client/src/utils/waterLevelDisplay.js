/** LED 수위 화면 전용: D1001 + 설치 기준 오프셋 (패널에는 적용 안 함) */
export const WATER_LEVEL_OFFSET_MM = 250;

export function getLedDisplayMmFromRaw(rawMm) {
  const raw = Number(rawMm);
  if (!Number.isFinite(raw)) return null;
  return parseFloat((raw + WATER_LEVEL_OFFSET_MM).toFixed(0));
}

export function getLedDisplayMm(data) {
  if (!data || typeof data.water_level !== "number") return null;
  return getLedDisplayMmFromRaw(data.water_level);
}
