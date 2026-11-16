import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated } from 'react-native';
import { KEYS, isOneOf, usePersistentState } from '../../lib/storage';
import { DEFAULT_FOREST_SCENE, FOREST_SCENES, FOREST_WEATHERS, type ForestSceneDef, type ForestWeather } from './forestScenes';

/**
 * 숲 공간 상태 (숲 안의 모든 화면이 함께 씀)
 * - soundOn: 이번 방문에서 소리를 켰는지 (들어올 때마다 꺼진 상태로 시작)
 * - weather: 날씨 (기기에 저장, Phase 3 Rain Mode에서 'rain' 연결)
 * - scene: 지금 숲 장면 (시간대별 숲 확장용)
 * - ui: 몇 초 동안 손대지 않으면 메뉴가 옅어지고, 화면을 누르면 다시 보임
 */
type ForestSpaceValue = {
  scene: ForestSceneDef;
  soundOn: boolean;
  setSoundOn: (on: boolean) => void;
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
  const [soundOn, setSoundOn] = useState(false);
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
