import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { forestPlayers, FOREST_TRACK_ORDER, type ForestSoundSettings } from './useForestSound';
import { FOREST_TRACKS } from './sounds';
import { addOtherAudioListener, isOtherAudioPlaying } from '../../modules/other-audio';

/**
 * 숲 공간의 자연음 (귀뚜라미·풀벌레 + 나뭇잎 바람)
 *
 * - 자동으로 재생하지 않습니다. 사용자가 「소리 켜기」를 누르면(soundOn) 천천히 시작합니다.
 * - 숲 공간 레이아웃이 한 번만 부르므로, 숲 안에서 숨 고르기·머물기로 바꿔도 끊기지 않습니다.
 * - 숲을 떠나면(레이아웃이 사라지면) 1.5초 동안 줄어들며 멈춥니다.
 * - 다른 앱으로 전환하면 잠시 멈추고, 돌아오면 이어집니다.
 * - iOS 앱에서는 다른 앱 음악이 재생 중이면 양보합니다.
 * - 아이폰 무음 스위치는 우회하지 않습니다(웹: ambient 오디오).
 */
export function useForestAmbience(soundOn: boolean, settings: ForestSoundSettings) {
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background');
  const [yielded, setYielded] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') setAppActive(false);
      if (state === 'active') {
        setAppActive(true);
        setYielded(isOtherAudioPlaying());
      }
    });
    const other = addOtherAudioListener(setYielded);
    return () => {
      sub.remove();
      other.remove();
    };
  }, []);

  // 소리를 켜는 순간 다른 앱 음악이 나오고 있는지 확인
  useEffect(() => {
    if (soundOn) setYielded(isOtherAudioPlaying());
  }, [soundOn]);

  useEffect(() => {
    for (const key of FOREST_TRACK_ORDER) {
      const p = forestPlayers[key];
      const volume = settings.volume[key];
      const wanted = soundOn && !settings.muted[key] && volume > 0;
      if (!wanted) {
        // 소리 끄기·음소거: 천천히 줄이며 멈춤 (다시 켜면 이어서)
        p.pause(800);
      } else if (!appActive || yielded) {
        p.pause(appActive ? 1200 : 0);
      } else if (p.currentKey !== key) {
        p.setVolume(volume, 1);
        void p.playTrack(FOREST_TRACKS[key], 2500);
      } else {
        p.setVolume(volume, 300);
        if (!p.isPlaying) p.resume(1500);
      }
    }
  }, [soundOn, settings, appActive, yielded]);

  useEffect(
    () => () => {
      for (const key of FOREST_TRACK_ORDER) forestPlayers[key].fadeOutAndStop(1500);
    },
    [],
  );

  return { yieldedToMusic: soundOn && yielded };
}
