import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 숲에 머물기용 선택 타이머
 * - 기본은 타이머 없음(시간 제한 없이 머묾)
 * - 시간을 고르면 바로 시작하고, 쉬는 중에도 다른 시간으로 바꿀 수 있음(새 시간부터 다시 셈)
 * - 일시정지·다시 시작
 * - 실제 흐른 시간으로 셈하므로 다른 앱에 다녀와도 정확함
 */
export type StayTimerState = 'off' | 'running' | 'paused' | 'done';

export function useStayTimer() {
  const [seconds, setSeconds] = useState<number | null>(null);
  const [state, setState] = useState<StayTimerState>('off');
  const [remainingSec, setRemainingSec] = useState(0);
  const endAt = useRef(0);
  const leftWhenPaused = useRef(0);

  const tick = useCallback(() => {
    const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
    setRemainingSec(left);
    if (left <= 0) setState('done');
  }, []);

  useEffect(() => {
    if (state !== 'running') return;
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [state, tick]);

  /** 시간 고르기(초 단위): null이면 타이머 끄기 */
  const choose = useCallback((sec: number | null) => {
    setSeconds(sec);
    if (sec == null) {
      setState('off');
      setRemainingSec(0);
      return;
    }
    endAt.current = Date.now() + sec * 1000;
    setRemainingSec(sec);
    setState('running');
  }, []);

  const pause = useCallback(() => {
    if (state !== 'running') return;
    leftWhenPaused.current = Math.max(0, endAt.current - Date.now());
    setState('paused');
  }, [state]);

  const resume = useCallback(() => {
    if (state !== 'paused') return;
    endAt.current = Date.now() + leftWhenPaused.current;
    setState('running');
  }, [state]);

  const reset = useCallback(() => {
    setSeconds(null);
    setState('off');
    setRemainingSec(0);
  }, []);

  return { seconds, state, remainingSec, choose, pause, resume, reset };
}
