import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated } from 'react-native';
import { KEYS, isOneOf, usePersistentState } from '../../lib/storage';
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
  weather: ForestWeather;
  setWeather: (w: ForestWeather) => void;
  uiOpacity: Animated.Value;
  /** 메뉴가 사라진 상태: 이때 첫 터치는 메뉴만 다시 보이게 하고 버튼은 누르지 않음 */
  uiHidden: boolean;
  /** 메뉴를 다시 보이게 하고, 옅어지는 시간을 다시 셈 */
  wakeUi: () => void;
  /** 활동 중처럼 메뉴를 계속 보이게 하거나(false) 다시 자동으로 옅어지게(true) */
  setAutoHide: (on: boolean) => void;
};

const Ctx = createContext<ForestSpaceValue | null>(null);

const HIDE_AFTER_MS = 4000;
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
  const [weather, setWeather] = usePersistentState<ForestWeather>(KEYS.forestWeather, 'clear', isOneOf(FOREST_WEATHERS));
  const uiOpacity = useRef(new Animated.Value(1)).current;
  const [autoHide, setAutoHide] = useState(true);
  const [uiHidden, setUiHidden] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wakeUi = useCallback(() => {
    Animated.timing(uiOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    setUiHidden(false);
    if (timer.current) clearTimeout(timer.current);
    if (!autoHide) return;
    timer.current = setTimeout(() => {
      setUiHidden(true);
      Animated.timing(uiOpacity, { toValue: DIM_OPACITY, duration: 1600, useNativeDriver: true }).start();
    }, HIDE_AFTER_MS);
  }, [autoHide, uiOpacity]);

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
        weather,
        setWeather,
        uiOpacity,
        uiHidden,
        wakeUi,
        setAutoHide,
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
