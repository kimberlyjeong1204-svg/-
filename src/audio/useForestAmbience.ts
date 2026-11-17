import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { forestPlayers, FOREST_TRACK_ORDER, type ForestSoundSettings } from './useForestSound';
import { FOREST_TRACKS } from './sounds';
import { existingContext } from './webAudio';
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
 * - 상태(status)는 실제로 소리가 나는지 확인해서 알려 줍니다. 브라우저가 재생을 막으면 'blocked'.
 */
export type ForestSoundStatus = 'off' | 'starting' | 'on' | 'blocked' | 'held';
/**
 * @param hold true면 소리를 켠 상태는 유지한 채 잠시 쉼 (숨 고르기 「내 음악과 함께」). 상태는 'held'
 */
export function useForestAmbience(soundOn: boolean, settings: ForestSoundSettings, fadeInMs = 2500, hold = false, volumeRampMs = 300, keepPlaying = false) {
  const [appActiveRaw, setAppActive] = useState(AppState.currentState !== 'background');
  // 「화면을 꺼도 계속 듣기」: 다른 앱·화면 잠금에도 멈추지 않음
  const appActive = keepPlaying || appActiveRaw;
  const [yielded, setYielded] = useState(false);
  // 소리가 나야 하는데 어떤 이유로(화면 전환·아이폰 오디오 중단 등) 멈춰 있으면 다시 켜기 위한 신호
  const [heal, setHeal] = useState(0);
  const lastHeal = useRef(0);

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
      } else if (!appActive || yielded || hold) {
        p.pause(appActive ? 1200 : 0);
      } else if (p.currentKey !== key) {
        p.setVolume(volume, 1);
        void p.playTrack(FOREST_TRACKS[key], fadeInMs);
      } else {
        p.setVolume(volume, volumeRampMs);
        if (!p.isPlaying) p.resume(Math.min(fadeInMs, 1500));
      }
    }
    // heal: 아래 점검에서 멈춘 재생기를 발견하면 다시 적용
  }, [soundOn, settings, appActive, yielded, fadeInMs, hold, volumeRampMs, heal]);

  useEffect(
    () => () => {
      for (const key of FOREST_TRACK_ORDER) forestPlayers[key].fadeOutAndStop(1500);
    },
    [],
  );

  // 실제로 소리가 나는지 주기적으로 확인 (버튼에 「켜짐」을 거짓으로 보이지 않기 위해)
  const [status, setStatus] = useState<ForestSoundStatus>('off');
  useEffect(() => {
    // 4초가 지나도 소리가 시작되지 않으면 막힌 것으로 보고 다시 켜기 안내
    const since = Date.now();
    const check = () => {
      const wantedKeys = FOREST_TRACK_ORDER.filter((k) => !settings.muted[k] && settings.volume[k] > 0);
      let next: ForestSoundStatus;
      if (soundOn && hold) next = 'held';
      else if (!soundOn || yielded || !appActive) next = 'off';
      else if (wantedKeys.length === 0) next = 'on';
      else if (wantedKeys.some((k) => !forestPlayers[k].isPlaying || forestPlayers[k].currentKey !== k)) {
        // 켜져 있어야 하는데 재생기가 멈춰 있음 → 다시 켜기(2초에 한 번까지)
        next = 'starting';
        if (Date.now() - lastHeal.current > 2000) {
          lastHeal.current = Date.now();
          setHeal((h) => h + 1);
        }
      } else if (wantedKeys.some((k) => forestPlayers[k].playbackBlocked)) next = 'blocked';
      else if (wantedKeys.some((k) => forestPlayers[k].isSounding)) next = 'on';
      else {
        next = Date.now() - since > 4000 ? 'blocked' : 'starting';
        // 오디오는 깨어 있는데 소리가 안 나면 재생기를 스스로 다시 시작(2초에 한 번까지)
        const c = existingContext();
        if (c?.state === 'running' && Date.now() - since > 1500 && Date.now() - lastHeal.current > 2000) {
          lastHeal.current = Date.now();
          for (const k of wantedKeys) forestPlayers[k].retry();
        }
      }
      setStatus(next);
    };
    check();
    if (!soundOn) return;
    const id = setInterval(check, 400);
    return () => clearInterval(id);
  }, [soundOn, settings, yielded, appActive, hold]);

  /** 브라우저가 재생을 막았을 때: 사용자가 누른 순간에 다시 재생 */
  const retry = useCallback(() => {
    for (const key of FOREST_TRACK_ORDER) {
      const p = forestPlayers[key];
      if (settings.muted[key] || settings.volume[key] <= 0) continue;
      if (p.currentKey === key) p.retry();
      else void p.playTrack(FOREST_TRACKS[key], 1500);
    }
  }, [settings]);

  return { yieldedToMusic: soundOn && yielded, status, retry };
}
