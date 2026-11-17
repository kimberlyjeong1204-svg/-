/**
 * 동굴 그림 설정 — 최종 동굴 그림을 받으면 이 파일만 바꾸면 됩니다.
 * 좌표는 그림 기준 비율(0~1).
 */
export const CAVE_IMAGE = {
  source: require('../../../assets/cave/cave-temp.webp'),
  width: 780,
  height: 1688,
  /** 임시 그림이면 true: 장작더미를 코드로 그림(최종 그림에 장작이 있으면 false) */
  temporary: true,
};

/** 장작불 자리(불꽃이 피어오르는 바닥 가운데) */
export const FIRE = { x: 0.5, y: 0.8, scale: 1 };

/** 그림을 화면에 꽉 채울 때(cover) 그림 좌표 → 화면 좌표 */
export function caveCover(w: number, h: number) {
  const k = Math.max(w / CAVE_IMAGE.width, h / CAVE_IMAGE.height);
  const ox = (w - CAVE_IMAGE.width * k) / 2;
  const oy = (h - CAVE_IMAGE.height * k) / 2;
  return {
    k,
    ox,
    oy,
    toScreen: (u: number, v: number) => ({ x: ox + u * CAVE_IMAGE.width * k, y: oy + v * CAVE_IMAGE.height * k }),
  };
}

/** 화면에서 장작불 위치 */
export function fireOnScreen(w: number, h: number) {
  return caveCover(w, h).toScreen(FIRE.x, FIRE.y);
}
