/**
 * 동굴 그림 설정 — 최종 동굴 그림을 받으면 이 파일만 바꾸면 됩니다.
 * 좌표는 그림 기준 비율(0~1).
 *
 * 지금 그림: 소유자가 고른 동굴(cave-girl.webp, 1672×941 가로) — 거대한 바위 동굴·천장 빛 기둥,
 * 방석 위 여자아이 뒷모습과 장작불이 그림에 들어 있음. 불은 그림에 있으므로 코드는 불빛 일렁임과 불티만 얹음.
 */
export const CAVE_IMAGE = {
  source: require('../../../assets/cave/cave-girl.webp'),
  width: 1672,
  height: 941,
  /** 그림에 장작더미가 없으면 true (코드로 장작을 그림) */
  drawLogs: false,
};

/** 장작불 자리(불꽃이 피어오르는 바닥 가운데). scale: 그림 속 불 크기에 맞춘 불꽃 크기 */
export const FIRE = { x: 0.355, y: 0.795, scale: 0.45, sparksOnly: true };

/** 방석에 앉은 아이(조약돌이 날아가지 않게 피할 곳) */
export const CHILD = { x: 0.28, y: 0.77, w: 0.09, h: 0.16 };

/**
 * 세로 화면에서 넓은 동굴 보여 주기: 들어오면 그림의 startU 쪽(천장 빛 기둥·깊은 동굴)에서
 * endU 쪽(방석의 아이·장작불)으로 천천히 카메라가 옮겨 감. 동작 줄이기면 바로 endU. 아이와 불이 잘리지 않는 위치
 */
export const CAVE_PAN = { startU: 0.62, endU: 0.315, durationMs: 7000 };

/** 그림을 화면에 꽉 채울 때(cover) 그림 좌표 → 화면 좌표. pan: 0(시작)~1(장작불 쪽) */
export function caveCover(w: number, h: number, pan = 1) {
  const k = Math.max(w / CAVE_IMAGE.width, h / CAVE_IMAGE.height);
  const imgW = CAVE_IMAGE.width * k;
  const centerU = CAVE_PAN.startU + (CAVE_PAN.endU - CAVE_PAN.startU) * pan;
  const ox = imgW > w ? Math.min(0, Math.max(w - imgW, w / 2 - centerU * imgW)) : (w - imgW) / 2;
  const oy = (h - CAVE_IMAGE.height * k) / 2;
  return {
    k,
    ox,
    oy,
    toScreen: (u: number, v: number) => ({ x: ox + u * CAVE_IMAGE.width * k, y: oy + v * CAVE_IMAGE.height * k }),
  };
}

/** 화면에서 장작불 위치 (카메라가 다 옮겨 간 뒤) */
export function fireOnScreen(w: number, h: number) {
  return caveCover(w, h, 1).toScreen(FIRE.x, FIRE.y);
}

export const easePan = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** 화면에서 아이 자리(카메라가 다 옮겨 간 뒤) */
export function childOnScreen(w: number, h: number) {
  const c = caveCover(w, h, 1);
  const tl = c.toScreen(CHILD.x - CHILD.w / 2, CHILD.y - CHILD.h / 2);
  const br = c.toScreen(CHILD.x + CHILD.w / 2, CHILD.y + CHILD.h / 2);
  return { x0: tl.x, y0: tl.y, x1: br.x, y1: br.y };
}
