import { useEffect, useRef } from 'react';
import { ambience } from './ambiencePlayer';
import { SOUND_KEYS, type SoundKey } from './sounds';
import { KEYS, isOneOf, usePersistentState } from '../lib/storage';
import type { SessionPhase } from '../lib/useSession';

/** 고른 환경음. 기본값은 무음이며 기기에 저장되어 두 화면이 함께 씁니다. */
export function useSoundChoice() {
  return usePersistentState<SoundKey>(KEYS.sound, 'none', isOneOf(SOUND_KEYS));
}

/**
 * 휴식 상태에 맞춰 환경음을 재생합니다.
 * - 시작: 천천히 커짐 / 일시정지: 짧게 줄이며 멈춤 / 다시 시작: 천천히 커짐
 * - 시간이 다 됨: 약 3초 동안 줄어들며 정지
 * - 화면을 떠남(그만하기, 뒤로 가기): 약 1.5초 동안 줄어들며 정지
 */
export function useAmbience(phase: SessionPhase, sound: SoundKey) {
  const prevPhase = useRef<SessionPhase>(phase);
  const soundRef = useRef(sound);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = phase;
    if (prev === phase) return;

    if (phase === 'running') {
      if (prev === 'paused' && ambience.currentKey === soundRef.current) ambience.resume();
      else void ambience.start(soundRef.current);
    } else if (phase === 'paused') {
      ambience.pause();
    } else if (phase === 'done') {
      ambience.fadeOutAndStop(3000);
    } else if (phase === 'idle') {
      ambience.fadeOutAndStop(800);
    }
  }, [phase]);

  // 휴식 중에 소리를 바꾼 경우
  useEffect(() => {
    if (soundRef.current === sound) return;
    soundRef.current = sound;
    const p = phaseRef.current;
    if (p === 'running' || p === 'paused') void ambience.switchTo(sound, p === 'running');
  }, [sound]);

  useEffect(() => () => ambience.fadeOutAndStop(1500), []);
}
