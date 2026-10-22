/**
 * 서초 기본 섹션 번호.
 * 0 문구(1), 2 문구(2), 3 수위데이터 — 1번은 예전 문구(2) 자리라 비워 둠, 커스텀 섹션은 4번부터 차례로 씀.
 * 미세먼지·이벤트·전체이벤트(강남과 같은 탭)는 현장에 저장된 커스텀 섹션 번호와 겹치지 않게 16번대 사용.
 */
export const DUST_SECTION = 16;
export const EVENT_SECTION = 17;
export const ALL_EVENT_SECTION = 18;

export const ADDED_SECTIONS = [DUST_SECTION, EVENT_SECTION, ALL_EVENT_SECTION];
export const BASE_SECTIONS = [0, 2, 3, ...ADDED_SECTIONS];

/** 처음 설치했을 때 탭 순서: 문구(1), 문구(2), 미세먼지, 이벤트, 전체이벤트, 수위데이터 */
export const DEFAULT_SECTION_ORDER = [0, 2, ...ADDED_SECTIONS, 3];

/**
 * 예전에 저장된 탭 순서에 새 탭이 없으면 수위데이터(3) 앞에 끼워 넣음 (없으면 맨 뒤)
 * @param {number[]} order
 */
export function withAddedSections(order) {
  if (!Array.isArray(order) || ADDED_SECTIONS.every((s) => order.includes(s))) return order;
  const kept = order.filter((s) => !ADDED_SECTIONS.includes(s));
  const at = kept.indexOf(3);
  const insertAt = at >= 0 ? at : kept.length;
  return [...kept.slice(0, insertAt), ...ADDED_SECTIONS, ...kept.slice(insertAt)];
}
