/**
 * 숲 거닐기 장소 소리 (iOS 앱) — 장소별 녹음(폭포·새·잎·발소리)을 받으면 expo-audio로 연결. 지금은 소리 없음.
 * 웹: walkSound.web.ts
 */
export type WalkMix = { water: number; leaves: number; birdsNear: number; birdsFar: number };
export type Ground = 'leaves' | 'snow';
export function setWalkMix(_next: WalkMix, _rampMs = 3000) {}
export function startSteps(_g: Ground = 'leaves') {}
export function stopSteps() {}
export function stopWalk(_fadeMs = 1500) {}
export function walkState() {
  return { mix: { water: 0, leaves: 0, birdsNear: 0, birdsFar: 0 }, stepping: false };
}
