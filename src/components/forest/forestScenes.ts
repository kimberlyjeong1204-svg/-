import { forest, forestImages } from './forestConfig';

/**
 * 숲 장면 목록 (시간대별 숲을 구분하기 위한 자리)
 *
 * 지금은 「노을숲」 한 장면뿐입니다. 원본 그림은 밤에 가까운 색감이라 timeOfDay를 'twilight'로 둡니다.
 * 밤숲·새벽숲을 만들 때는 같은 모양으로 장면을 추가하고, 숲 공간은 고른 장면의 그림·데이터만 바꿔 씁니다.
 * (그림 파일·바람 마스크·별/반딧불이 위치 데이터를 장면마다 따로 둠)
 */
export type TimeOfDay = 'twilight' | 'night' | 'dawn';

export type ForestSceneDef = {
  id: string;
  /** 사용자에게 보이는 이름 */
  name: string;
  timeOfDay: TimeOfDay;
  images: typeof forestImages;
  data: typeof forest;
};

export const FOREST_SCENES: Record<string, ForestSceneDef> = {
  glade: { id: 'glade', name: '노을숲', timeOfDay: 'twilight', images: forestImages, data: forest },
};

export const DEFAULT_FOREST_SCENE = 'glade';

/** 날씨: 지금은 맑음만. Phase 3에서 'rain'(잔잔한 비)을 연결합니다. */
export type ForestWeather = 'clear' | 'rain';
export const FOREST_WEATHERS: readonly ForestWeather[] = ['clear', 'rain'];
