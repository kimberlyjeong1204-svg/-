import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated } from 'react-native';
import { KEYS, isBoolean, isOneOf, usePersistentState } from '../../lib/storage';
import { FOREST_MOTION } from './ui';
import type { SessionPhase } from '../../lib/useSession';
import type { SoundKey } from '../../audio/sounds';
import type { ForestSoundStatus } from '../../audio/useForestAmbience';
import { DEFAULT_SOUND_PREF, isSoundPref, type ForestSoundPref } from './soundPref';
import { DEFAULT_FOREST_SCENE, FOREST_SCENES, FOREST_WEATHERS, type ForestSceneDef, type ForestWeather } from './forestScenes';

/**
 * 숲 공간 상태 (숲 안의 모든 화면이 함께 씀)
 * - soundOn: 숲소리를 켰는지. 처음 방문 때 안내창에서 고르고, 그 뒤로는 마지막 선택을 기억함
 * - needsSoundPrompt: 아직 첫 방문 소리 안내창에서 고르지 않음
 * - weather: 날씨 (기기에 저장, Phase 3 Rain Mode에서 'rain' 연결)
 * - scene: 지금 숲 장면 (시간대별 숲 확장용)
 * - ui: 몇 초 동안 손대지 않으면 메뉴가 옅어지고, 화면을 누르면 다시 보임
 */
type ForestSpaceValue = {
  scene: ForestSceneDef;
  soundOn: boolean;
  /** 소리 켜기/끄기 (선택은 기기에 저장되어 다음 방문에도 이어짐) */
  setSoundOn: (on: boolean) => void;
  needsSoundPrompt: boolean;
  /** 저장된 소리 선택을 읽었는지 */
  soundPrefReady: boolean;
  /** 숨 고르기에서 「내 음악과 함께」를 고른 동안 숲소리를 잠시 쉬게 함 (사용자의 켜짐 선택은 그대로) */
  forestHold: boolean;
  /** 「화면을 꺼도 계속 듣기」(숲·동굴 공통, 기기에 저장) */
  keepAudio: boolean;
  setKeepAudio: (on: boolean) => void;
  /** 숲 거닐기의 걷는 시간(밤·새벽). 숲 기본 소리(귀뚜라미)를 맞춤. 거닐기 밖이면 null */
  walkMood: 'night' | 'dawn' | null;
  setWalkMood: (m: 'night' | 'dawn' | null) => void;
  setForestHold: (hold: boolean) => void;
  /** 숲 숨 고르기의 소리 상태: 숲의 비 소리 채널이 Rain Mode와 함께 맞춰 재생 */
  breatheAudio: BreatheAudio;
  setBreatheAudio: (a: BreatheAudio) => void;
  weather: ForestWeather;
  setWeather: (w: ForestWeather) => void;
  uiOpacity: Animated.Value;
  /** 메뉴가 사라진 상태: 이때 첫 터치는 메뉴만 다시 보이게 하고 버튼은 누르지 않음 */
  uiHidden: boolean;
  /** 메뉴를 다시 보이게 하고, 옅어지는 시간을 다시 셈 */
  wakeUi: () => void;
  /** 메뉴를 바로 숨김 (숲 입구 연출 중·숲에 막 도착했을 때) */
  hideUi: () => void;
  /** 활동 중처럼 메뉴를 계속 보이게 하거나(false) 다시 자동으로 옅어지게(true) */
  setAutoHide: (on: boolean) => void;
  /** 숲소리의 실제 상태(꺼짐·켜는 중·켜짐·재생 차단·잠시 쉼). 숲 레이아웃이 알려 줌 */
  soundStatus: ForestSoundStatus;
  reportSound: (status: ForestSoundStatus, retry: () => void) => void;
  /** 재생이 막혔을 때 사용자가 누른 순간 다시 재생 */
  retrySound: () => void;
  /** 숲 입구 연출처럼 숲 메뉴가 나오면 안 될 때 true */
  setUiSuppressed: (on: boolean) => void;
  /** 화면마다 메뉴가 숨기까지의 시간(ms). 숲 첫 화면은 조금 길게 */
  setHideDelay: (ms: number) => void;
  /** 숲 그림을 만졌을 때(창 기준 좌표). 숲 장면이 잎 흔들림·반딧불이로 답함 */
  touchForest: (x: number, y: number) => void;
  /** 숲 장면이 만짐을 받도록 등록 */
  onForestTouch: (fn: ((x: number, y: number) => void) | null) => void;
  /** 위쪽 뒤로 가기 전에 화면이 먼저 처리할 일(확인창·근접 화면 닫기). false를 돌려주면 뒤로 가지 않음 */
  setLeaveGuard: (fn: (() => boolean) | null) => void;
  /** 뒤로 가도 되는지 (등록된 처리 실행) */
  runLeaveGuard: () => boolean;
};

export type BreatheAudio = { phase: SessionPhase; sound: SoundKey };
export const NO_BREATHE_AUDIO: BreatheAudio = { phase: 'idle', sound: 'none' };

const Ctx = createContext<ForestSpaceValue | null>(null);

const HIDE_AFTER_MS = FOREST_MOTION.hideAfter;
const DIM_OPACITY = 0;

export function ForestSpaceProvider({ children }: { children: ReactNode }) {
  const [pref, setPref, prefReady] = usePersistentState<ForestSoundPref>(KEYS.forestSoundPref, DEFAULT_SOUND_PREF, isSoundPref);
  const [soundOn, setSoundOnState] = useState(false);
  // 다시 방문: 저장된 선택을 읽은 뒤 한 번만 적용 (켜 두었으면 숲에 들어온 탭을 계기로 천천히 시작)
  const restored = useRef(false);
  useEffect(() => {
    if (!prefReady || restored.current) return;
    restored.current = true;
    if (pref.prompted && pref.on) setSoundOnState(true);
  }, [prefReady, pref]);
  const setSoundOn = useCallback(
    (on: boolean) => {
      restored.current = true;
      setSoundOnState(on);
      setPref({ prompted: true, on });
    },
    [setPref],
  );
  const needsSoundPrompt = prefReady && !pref.prompted;
  const [forestHold, setForestHold] = useState(false);
  const [keepAudio, setKeepAudio] = usePersistentState<boolean>(KEYS.keepAudio, false, isBoolean);
  const [walkMood, setWalkMood] = useState<'night' | 'dawn' | null>(null);
  const [breatheAudio, setBreatheAudio] = useState<BreatheAudio>(NO_BREATHE_AUDIO);
  const [weather, setWeather] = usePersistentState<ForestWeather>(KEYS.forestWeather, 'clear', isOneOf(FOREST_WEATHERS));
  const uiOpacity = useRef(new Animated.Value(1)).current;
  const [autoHide, setAutoHide] = useState(true);
  const [hideDelay, setHideDelayState] = useState<number>(HIDE_AFTER_MS);
  // 바뀐 시간이 바로 다음 숨김 타이머에 적용되도록 ref로도 들고 있음
  const hideDelayRef = useRef<number>(HIDE_AFTER_MS);
  const setHideDelay = useCallback((ms: number) => {
    hideDelayRef.current = ms;
    setHideDelayState(ms);
  }, []);
  const [soundStatus, setSoundStatus] = useState<ForestSoundStatus>('off');
  const retryRef = useRef<() => void>(() => {});
  const reportSound = useCallback((status: ForestSoundStatus, retry: () => void) => {
    retryRef.current = retry;
    setSoundStatus(status);
  }, []);
  const retrySound = useCallback(() => retryRef.current(), []);
  const touchListener = useRef<((x: number, y: number) => void) | null>(null);
  const touchForest = useCallback((x: number, y: number) => touchListener.current?.(x, y), []);
  const onForestTouch = useCallback((fn: ((x: number, y: number) => void) | null) => {
    touchListener.current = fn;
  }, []);
  const leaveGuard = useRef<(() => boolean) | null>(null);
  const setLeaveGuard = useCallback((fn: (() => boolean) | null) => {
    leaveGuard.current = fn;
  }, []);
  const runLeaveGuard = useCallback(() => (leaveGuard.current ? leaveGuard.current() : true), []);
  const [uiHidden, setUiHidden] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 숲 입구 연출 중에는 숲 메뉴를 깨우지 않음 (문틈으로 메뉴가 비쳐 보이지 않게)
  const suppressed = useRef(false);
  const setUiSuppressed = useCallback((on: boolean) => {
    suppressed.current = on;
  }, []);
  const wakeUi = useCallback(() => {
    if (suppressed.current) return;
    Animated.timing(uiOpacity, { toValue: 1, duration: FOREST_MOTION.uiIn, useNativeDriver: true }).start();
    setUiHidden(false);
    if (timer.current) clearTimeout(timer.current);
    if (!autoHide) return;
    timer.current = setTimeout(() => {
      setUiHidden(true);
      Animated.timing(uiOpacity, { toValue: DIM_OPACITY, duration: FOREST_MOTION.uiOut, useNativeDriver: true }).start();
    }, hideDelayRef.current);
  }, [autoHide, uiOpacity, hideDelay]);

  const hideUi = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    uiOpacity.setValue(DIM_OPACITY);
    setUiHidden(true);
  }, [uiOpacity]);

  useEffect(() => {
    wakeUi();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [wakeUi]);

  return (
    <Ctx.Provider
      value={{
        scene: FOREST_SCENES[DEFAULT_FOREST_SCENE],
        soundOn,
        setSoundOn,
        needsSoundPrompt,
        soundPrefReady: prefReady,
        forestHold,
        setForestHold,
        keepAudio,
        setKeepAudio,
        walkMood,
        setWalkMood,
        breatheAudio,
        setBreatheAudio,
        weather,
        setWeather,
        uiOpacity,
        uiHidden,
        wakeUi,
        hideUi,
        soundStatus,
        reportSound,
        retrySound,
        setHideDelay,
        setUiSuppressed,
        touchForest,
        onForestTouch,
        setAutoHide,
        setLeaveGuard,
        runLeaveGuard,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useForestSpace() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useForestSpace는 숲 공간(/forest) 안에서만 쓸 수 있어요.');
  return v;
}
