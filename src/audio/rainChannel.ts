import { ambience, ambienceAlt } from './ambiencePlayer';
import type { AmbienceKey } from './sounds';

/**
 * 앱의 「비 소리 채널」: 숨 고르기 빗소리와 숲의 Rain Mode가 함께 씁니다.
 * 재생기 두 개를 번갈아 써서, 비 종류가 바뀔 때만 잠깐 겹쳐 넘기고 들리는 비는 항상 하나입니다.
 * 같은 값으로 여러 번 불러도 결과가 같습니다(원하는 상태를 맞추기만 함).
 */
const PLAYERS = [ambience, ambienceAlt] as const;
let current = 0;

export type RainWant = {
  /** 들려야 할 비 (없으면 null) */
  key: AmbienceKey | null;
  /** false면 잠시 멈춤(일시정지·다른 앱 음악·앱 전환) */
  playing: boolean;
  fadeInMs?: number;
  fadeOutMs?: number;
  /** 잠시 멈출 때 줄이는 시간 */
  pauseMs?: number;
};

export function driveRain({ key, playing, fadeInMs = 1500, fadeOutMs = 800, pauseMs = 500 }: RainWant) {
  const player = PLAYERS[current];
  if (!key) {
    for (const p of PLAYERS) p.fadeOutAndStop(fadeOutMs);
    return;
  }
  if (!playing) {
    player.pause(pauseMs);
    return;
  }
  if (player.currentKey === key) {
    if (!player.isPlaying) player.resume(fadeInMs);
    return;
  }
  if (player.currentKey === 'none') {
    void player.start(key, fadeInMs);
    return;
  }
  // 다른 비로 바꿈: 지금 비는 2초 동안 줄이고, 다른 재생기로 새 비를 키움
  player.fadeOutAndStop(2000);
  current = 1 - current;
  const next = PLAYERS[current];
  if (next.currentKey === key && next.isPlaying) return;
  void next.start(key, Math.max(1500, Math.min(fadeInMs, 2500)));
}

export function stopRain(fadeOutMs = 1500) {
  for (const p of PLAYERS) p.fadeOutAndStop(fadeOutMs);
}
