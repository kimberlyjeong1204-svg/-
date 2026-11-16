import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

export type SessionPhase = 'idle' | 'running' | 'paused' | 'done';

const KEEP_AWAKE_TAG = 'shimpyo-session';

/**
 * 휴식 타이머.
 *
 * - 경과 시간은 실제 시각 차이로 누적하므로 화면 갱신이 늦어져도 시간이 틀어지지 않습니다.
 * - 매 프레임 `onFrame(경과ms)`을 불러 애니메이션을 그립니다. (리렌더링 없이)
 * - 남은 초가 바뀔 때만 화면을 다시 그립니다.
 * - 앱이 백그라운드로 가면 자동으로 일시정지합니다.
 * - 진행 중에는 화면이 꺼지지 않게 합니다.
 */
export function useSession(durationSec: number, onFrame?: (elapsedMs: number) => void) {
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [remainingSec, setRemainingSec] = useState(durationSec);

  const phaseRef = useRef<SessionPhase>('idle');
  const elapsedRef = useRef(0);
  const lastTsRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const durationRef = useRef(durationSec);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const setPhaseBoth = useCallback((p: SessionPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const loop = useCallback(() => {
    const now = Date.now();
    elapsedRef.current += now - lastTsRef.current;
    lastTsRef.current = now;

    const totalMs = durationRef.current * 1000;
    if (elapsedRef.current >= totalMs) {
      elapsedRef.current = totalMs;
      onFrameRef.current?.(totalMs);
      setRemainingSec(0);
      stopLoop();
      setPhaseBoth('done');
      return;
    }

    onFrameRef.current?.(elapsedRef.current);
    const left = durationRef.current - Math.floor(elapsedRef.current / 1000);
    setRemainingSec((prev) => (prev === left ? prev : left));
    rafRef.current = requestAnimationFrame(loop);
  }, [setPhaseBoth, stopLoop]);

  const run = useCallback(() => {
    lastTsRef.current = Date.now();
    setPhaseBoth('running');
    stopLoop();
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, setPhaseBoth, stopLoop]);

  const pause = useCallback(() => {
    if (phaseRef.current !== 'running') return;
    stopLoop();
    setPhaseBoth('paused');
  }, [setPhaseBoth, stopLoop]);

  const toggle = useCallback(() => {
    if (phaseRef.current === 'running') pause();
    else if (phaseRef.current === 'idle' || phaseRef.current === 'paused') run();
  }, [pause, run]);

  /** 시작 전 상태로 되돌립니다. 시간 선택을 바꿀 때 씁니다. */
  const reset = useCallback(
    (nextDurationSec: number) => {
      stopLoop();
      durationRef.current = nextDurationSec;
      elapsedRef.current = 0;
      setRemainingSec(nextDurationSec);
      setPhaseBoth('idle');
    },
    [setPhaseBoth, stopLoop],
  );

  // 앱이 백그라운드로 가면 일시정지
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') pause();
    });
    return () => sub.remove();
  }, [pause]);

  // 진행 중에는 화면이 꺼지지 않게
  useEffect(() => {
    if (phase === 'running') {
      activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    } else {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    }
  }, [phase]);

  // 화면을 벗어나면 정리
  useEffect(
    () => () => {
      stopLoop();
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    },
    [stopLoop],
  );

  return { phase, remainingSec, toggle, pause, reset, elapsedRef };
}

export function formatTime(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
