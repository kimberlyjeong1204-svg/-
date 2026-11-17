import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { MAX_VOICES, WINDCHIME_TAPS } from './windchimeSounds';

/**
 * 나무 풍경 소리 (iOS 앱): 효과음 10개를 재생기로 미리 만들어 두고, 부딪힐 때 하나를 골라 처음부터 재생.
 * 웹은 chimeSound.web.ts. 무음 스위치·다른 앱 음악 규칙은 앱 오디오 설정(환경음과 같음)을 따릅니다.
 */
let players: AudioPlayer[] | null = null;
let busyUntil: number[] = [];
let lastIndex = -1;

export function preloadChime() {
  if (players) return Promise.resolve();
  try {
    players = WINDCHIME_TAPS.map((s) => createAudioPlayer(s));
    busyUntil = players.map(() => 0);
  } catch {
    players = [];
  }
  return Promise.resolve();
}

export function chimeHit(_piece: number, strength: number, _pan = 0) {
  if (!players) void preloadChime();
  if (!players || players.length === 0) return;
  const now = Date.now();
  if (busyUntil.filter((t) => t > now).length >= MAX_VOICES) return;
  const free = players.map((_, i) => i).filter((i) => busyUntil[i] <= now && i !== lastIndex);
  if (free.length === 0) return;
  const i = free[Math.floor(Math.random() * free.length)];
  lastIndex = i;
  const s = Math.max(0, Math.min(1, strength));
  try {
    const p = players[i];
    p.volume = 0.12 + 0.5 * s * s;
    void p.seekTo(0);
    p.play();
    busyUntil[i] = now + 900;
  } catch {
    // 소리가 없어도 풍경은 그대로 흔들림
  }
}

export function chimeVoices() {
  return busyUntil.filter((t) => t > Date.now()).length;
}
