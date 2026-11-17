/**
 * 동굴 소리 (iOS 앱) — 아직 연결 전입니다.
 * 웹(caveSound.web.ts)은 Web Audio로 장작불·울림·조약돌·종이 소리를 만듭니다.
 * iOS 앱은 라이선스가 확인된 장작불 녹음을 받으면 expo-audio로 연결합니다(그 전에는 소리 없이 동작).
 */
export function startCaveFire(_fadeMs = 3000) {}
export function stopCaveFire(_fadeMs = 2500) {}
export function fireFlare() {}
export function paperTear() {}
export function logDrop() {}
export function setCaveFireVolume(_v: number, _rampMs = 300) {}
export function pebbleHit(_pan = 0, _size = 1) {}
export function caveFireActive() {
  return false;
}
