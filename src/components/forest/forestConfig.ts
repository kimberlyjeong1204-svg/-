import forestData from '../../../assets/forest/forest-data.json';

/**
 * 숲속 휴식 공간 설정
 * 검토 도구(design/forest)에서 정한 값을 그대로 씁니다.
 */
export const FOREST = {
  /** 잎 흔들림 배율 (바람 마스크가 밝은 곳만 최대 약 5 이미지 px 일렁임) */
  leafSway: 1.0,
  /** 반딧불이 수 */
  fireflies: 10,
  /** 반딧불이 밝기 */
  fireflyBrightness: 0.8,
  /** 별 반짝임 */
  starTwinkle: 0.6,
} as const;

/** 배경 이미지 크기 (세로 확장본) */
export const FOREST_IMAGE = { width: 1290, height: 2796 } as const;

export type ForestData = {
  size: [number, number];
  /** 작은 사람 위치 (0~1). 화면을 채울 때 이 점을 기준으로 맞춥니다. */
  person: [number, number];
  /** [x, y, 밝기] (0~1 좌표) */
  stars: [number, number, number][];
  /** [x, y, 반지름] 원본에 그려져 있던 반딧불이 자리 → 움직이는 반딧불이의 출발점 */
  flies: [number, number, number][];
};

export const forest = forestData as unknown as ForestData;

export const forestImages = {
  background: require('../../../assets/forest/forest-bg.webp'),
  windMask: require('../../../assets/forest/wind-mask.png'),
};

/**
 * 화면을 빈틈없이 채우되 작은 사람이 보이도록 이미지 영역을 고릅니다.
 * 반환값은 이미지의 어느 부분(0~1)을 화면에 보여 줄지입니다.
 *  - 화면이 이미지보다 좁으면 좌우를 잘라내되 사람이 가운데쯤 오게
 *  - 화면이 이미지보다 넓으면 위아래를 잘라내되 사람이 아래 40% 지점쯤 오게
 */
export function coverView(screenW: number, screenH: number) {
  const A = screenW / Math.max(1, screenH);
  const I = FOREST_IMAGE.width / FOREST_IMAGE.height;
  const [fx, fy] = forest.person;
  if (A > I) {
    const sy = I / A;
    return { sx: 1, sy, ox: 0, oy: Math.min(1 - sy, Math.max(0, fy - sy * 0.6)) };
  }
  const sx = A / I;
  return { sx, sy: 1, ox: Math.min(1 - sx, Math.max(0, fx - sx / 2)), oy: 0 };
}
