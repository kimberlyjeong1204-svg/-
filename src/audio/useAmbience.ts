import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ambience } from './ambiencePlayer';
import { SOUND_KEYS, isAmbience, type SoundKey } from './sounds';
import { addOtherAudioListener, isOtherAudioPlaying } from '../../modules/other-audio';
import { KEYS, isOneOf, usePersistentState } from '../lib/storage';
import type { SessionPhase } from '../lib/useSession';

/** 고른 소리. 기본값은 무음이며 기기에 저장되어 두 화면이 함께 씁니다. */
export function useSoundChoice() {
  return usePersistentState<SoundKey>(KEYS.sound, 'none', isOneOf(SOUND_KEYS));
}

/**
 * 휴식 상태에 맞춰 환경음을 재생합니다.
 *
 * - 시작: 천천히 커짐 / 일시정지: 짧게 줄이며 멈춤 / 다시 시작: 천천히 커짐
 * - 시간이 다 됨: 약 3초 동안 줄어들며 정지 / 화면을 떠남: 약 1.5초 동안 줄어들며 정지
 * - 「내 음악과 함께」나 「소리 없음」이면 쉼표.는 오디오를 전혀 켜지 않습니다.
 *   그래서 YouTube Music, Spotify, Apple Music 등에서 듣던 음악이 끊기지 않습니다.
 * - 빗소리를 골랐더라도 다른 앱 음악이 재생 중이면 빗소리는 켜지 않습니다(양보).
 *   휴식 중에 음악이 멈추면 빗소리가 다시 천천히 들어옵니다.
 *   휴식 중에 사용자가 직접 빗소리를 다시 고르면 그 선택을 따릅니다.
 * - 다른 앱으로 전환하면 빗소리는 잠시 멈추고, 돌아오면 이어서 재생합니다. 타이머는 계속 흐릅니다.
 *
 * @returns yieldedToMusic: 다른 앱 음악 때문에 빗소리를 꺼 둔 상태인지 (화면 안내용)
 */
export function useAmbience(phase: SessionPhase, sound: SoundKey) {
  const [yielded, setYielded] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background');
  const prevPhase = useRef<SessionPhase>(phase);
  const prevSound = useRef<SoundKey>(sound);
  const inSession = phase === 'running' || phase === 'paused';
  const inSessionRef = useRef(inSession);
  inSessionRef.current = inSession;

  // 쉼표.가 화면에 있는 동안 다른 앱 음악이 시작되거나 멈춤
  useEffect(() => {
    const sub = addOtherAudioListener((playing) => {
      if (inSessionRef.current) setYielded(playing);
    });
    return () => sub.remove();
  }, []);

  // 다른 앱으로 전환했다가 돌아옴. 제어 센터·알림 센터(inactive)에서는 그대로 둡니다.
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

  // 원하는 상태에 맞춰 재생기를 조정
  useEffect(() => {
    const before = prevPhase.current;
    prevPhase.current = phase;
    const soundChanged = prevSound.current !== sound;
    prevSound.current = sound;

    let yieldNow = yielded;
    if (before === 'idle' && phase === 'running') {
      // 휴식을 시작하는 순간 다른 앱 음악이 나오고 있으면 빗소리는 켜지 않습니다.
      yieldNow = isOtherAudioPlaying();
    } else if (soundChanged && inSession) {
      // 휴식 중에 직접 소리를 고르면 그 선택을 따릅니다.
      yieldNow = false;
    } else if (phase === 'idle') {
      yieldNow = false;
    }
    if (yieldNow !== yielded) setYielded(yieldNow);

    if (!isAmbience(sound) || phase === 'idle' || phase === 'done') {
      ambience.fadeOutAndStop(phase === 'done' ? 3000 : 800);
      return;
    }
    if (phase === 'paused' || yieldNow || !appActive) {
      ambience.pause(!appActive ? 0 : yieldNow ? 1200 : 500);
      return;
    }
    if (ambience.currentKey === sound) {
      if (!ambience.isPlaying) ambience.resume(1200);
    } else {
      void ambience.start(sound);
    }
    // yielded는 위에서 계산해 반영하므로 의존성에 포함합니다.
  }, [phase, sound, yielded, appActive, inSession]);

  useEffect(() => () => ambience.fadeOutAndStop(1500), []);

  return { yieldedToMusic: yielded && isAmbience(sound) && inSession };
}
