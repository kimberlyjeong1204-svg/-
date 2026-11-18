import type { MusicKey } from './music';

/** 음악 — iOS 앱은 아직 연결 전(웹은 musicPlayer.web.ts) */
export function playMusic(_key: MusicKey, _fadeMs = 2500) {}
export function stopMusic(_fadeMs = 2500) {}
export function currentMusic(): MusicKey | null {
  return null;
}
