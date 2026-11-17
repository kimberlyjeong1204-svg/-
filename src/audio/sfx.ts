import { createAudioPlayer } from 'expo-audio';

/**
 * 짧은 효과음 한 번 재생 (iOS 앱). 웹은 sfx.web.ts.
 * 끝나면 재생기를 정리합니다. 무음 스위치는 앱 오디오 설정(환경음과 같은 방식)을 따릅니다.
 */
export function playOnce(source: number, volume = 1) {
  try {
    const player = createAudioPlayer(source);
    player.volume = Math.max(0, Math.min(1, volume));
    const sub = player.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) {
        sub.remove();
        player.remove();
      }
    });
    player.play();
  } catch {
    // 효과음이 없어도 앱은 그대로 동작
  }
}
