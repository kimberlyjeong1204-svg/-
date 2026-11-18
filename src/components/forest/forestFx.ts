/**
 * 숲 장면(ForestScene)과 돗자리 장면(RestScene)이 함께 쓰는 작은 상태
 * - 바람: 돗자리 장면이 잔바람을 일으키면 가까운 풀(돗자리 장면)이 먼저, 숲의 잎(ForestScene)은 조금 늦게 흔들리다 잦아듦
 * - 비 가림: 아이 머리 위 넓은 가지가 비를 받아 주는 범위(그림 좌표). 그 아래로는 빗줄기를 그리지 않음
 */
let gustStart = -100;
let gustPower = 0;

/** 잔바람 시작(세기 0~1) */
export function triggerGust(power = 1) {
  gustStart = performance.now() / 1000;
  gustPower = power;
}

/** 지금 바람 세기(0~1). delay초 늦게 반응하는 것은 delay를 줌. 0.7초에 걸쳐 커지고 약 4초 동안 잦아듦 */
export function gustAt(now: number, delay = 0) {
  const t = now - gustStart - delay;
  if (t < 0 || t > 6) return 0;
  const rise = Math.min(1, t / 0.7);
  const fall = t < 0.7 ? 1 : Math.exp(-(t - 0.7) / 1.6);
  return gustPower * rise * fall;
}

export type Shelter = { u0: number; u1: number; vTop: number } | null;
let shelter: Shelter = null;
export function setRainShelter(s: Shelter) {
  shelter = s;
}
export function rainShelter() {
  return shelter;
}
