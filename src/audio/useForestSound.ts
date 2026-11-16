import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { AmbiencePlayer } from './ambiencePlayer';
import { FOREST_DEFAULT_VOLUME, FOREST_TRACKS, type ForestTrackKey } from './sounds';
import { addOtherAudioListener, isOtherAudioPlaying } from '../../modules/other-audio';
import { KEYS, usePersistentState } from '../lib/storage';
import type { SessionPhase } from '../lib/useSession';

/**
 * 숲 소리: 귀뚜라미·풀벌레와 나뭇잎 사이 바람을 각각 따로 반복 재생합니다.
 * - 두 트랙이 동시에 재생되고, 음량과 음소거를 따로 정할 수 있습니다(기기에 저장).
 * - 반복 이음새는 같은 음원을 두 번 열어 몇 초 겹쳐 넘깁니다(빗소리와 같은 재생기).
 * - 시작: 천천히 커짐 / 일시정지: 짧게 줄이며 멈춤 / 끝: 약 3초 동안 줄어들며 정지 / 화면을 떠남: 약 1.5초
 * - 다른 앱 음악이 재생 중이면(iOS 앱) 숲 소리는 양보합니다. 다른 앱으로 전환하면 잠시 멈췄다가 돌아오면 이어집니다.
 */

export type ForestSoundSettings = {
  on: boolean;
  volume: Record<ForestTrackKey, number>;
  muted: Record<ForestTrackKey, boolean>;
};

export const FOREST_TRACK_ORDER: ForestTrackKey[] = ['forestBugs', 'forestWind'];

export const DEFAULT_FOREST_SOUND: ForestSoundSettings = {
  on: true,
  volume: { ...FOREST_DEFAULT_VOLUME },
  muted: { forestBugs: false, forestWind: false },
};

const isVol = (v: unknown) => typeof v === 'number' && v >= 0 && v <= 1;
function isForestSoundSettings(v: unknown): v is ForestSoundSettings {
  const o = v as ForestSoundSettings;
  return (
    !!o &&
    typeof o.on === 'boolean' &&
    !!o.volume &&
    !!o.muted &&
    FOREST_TRACK_ORDER.every((k) => isVol(o.volume[k]) && typeof o.muted[k] === 'boolean')
  );
}

export function useForestSoundSettings() {
  return usePersistentState<ForestSoundSettings>(KEYS.forestSound, DEFAULT_FOREST_SOUND, isForestSoundSettings);
}

// 트랙마다 재생기 하나씩 (앱 전체에서 공유: 멍때리기의 숲 배경과 /forest 숲 공간이 함께 씀)
export const forestPlayers: Record<ForestTrackKey, AmbiencePlayer> = {
  forestBugs: new AmbiencePlayer(),
  forestWind: new AmbiencePlayer(),
};

const players = forestPlayers;

export function useForestSound(phase: SessionPhase, active: boolean, settings: ForestSoundSettings) {
  const [yielded, setYielded] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background');
  const prevPhase = useRef<SessionPhase>(phase);
  const inSessionRef = useRef(false);
  inSessionRef.current = phase === 'running' || phase === 'paused';

  useEffect(() => {
    const sub = addOtherAudioListener((playing) => {
      if (inSessionRef.current) setYielded(playing);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') setAppActive(false);
      if (state === 'active') {
        setAppActive(true);
        if (inSessionRef.current) setYielded(isOtherAudioPlaying());
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const before = prevPhase.current;
    prevPhase.current = phase;
    let yieldNow = yielded;
    if (before === 'idle' && phase === 'running') yieldNow = isOtherAudioPlaying();
    if (phase === 'idle') yieldNow = false;
    if (yieldNow !== yielded) setYielded(yieldNow);

    for (const key of FOREST_TRACK_ORDER) {
      const p = players[key];
      const volume = settings.volume[key];
      const wanted = active && settings.on && !settings.muted[key] && volume > 0;
      if (!active || phase === 'idle') {
        p.fadeOutAndStop(800);
      } else if (phase === 'done') {
        p.fadeOutAndStop(3000);
      } else if (phase === 'paused' || !appActive || yieldNow || !wanted) {
        p.pause(!appActive ? 0 : 600);
      } else if (p.currentKey !== key) {
        p.setVolume(volume, 1);
        void p.playTrack(FOREST_TRACKS[key], 2500);
      } else {
        p.setVolume(volume, 300);
        if (!p.isPlaying) p.resume(1500);
      }
    }
  }, [phase, active, settings, yielded, appActive]);

  useEffect(
    () => () => {
      for (const key of FOREST_TRACK_ORDER) players[key].fadeOutAndStop(1500);
    },
    [],
  );

  return { yieldedToMusic: yielded && active && settings.on && inSessionRef.current };
}
