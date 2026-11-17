/**
 * 동굴 그림 설정 — 최종 동굴 그림을 받으면 이 파일만 바꾸면 됩니다.
 * 좌표는 그림 기준 비율(0~1).
 *
 * 지금 그림: 소유자가 보낸 동굴 레퍼런스(cave-ref-temp.webp, 1344×768 가로). **임시**입니다.
 * 넓고 깊은 바위 동굴·빛 기둥·장작불은 기획과 같지만, 사람이 어른이고 방석이 없어
 * 「방석에 무릎을 안고 앉은 작은 아이」 최종 그림으로 바꿔야 합니다(assets/cave/README.md).
 */
export const CAVE_IMAGE = {
  source: require('../../../assets/cave/cave-ref-temp.webp'),
  width: 1344,
  height: 768,
  /** 그림에 장작더미가 없으면 true (코드로 장작을 그림) */
  drawLogs: false,
};

/** 장작불 자리(불꽃이 피어오르는 바닥 가운데). scale: 그림 속 불 크기에 맞춘 불꽃 크기 */
export const FIRE = { x: 0.655, y: 0.86, scale: 0.55 };

/**
 * 세로 화면에서 넓은 동굴 보여 주기: 들어오면 그림의 startU 쪽(빛 기둥·깊은 동굴)에서
 * endU 쪽(장작불·사람)으로 천천히 카메라가 옮겨 감. 동작 줄이기면 바로 endU
 */
export const CAVE_PAN = { startU: 0.42, endU: 0.735, durationMs: 7000 };

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
