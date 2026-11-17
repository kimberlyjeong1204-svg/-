import type { Ground, WalkMix } from '../../audio/walkSound';

/**
 * 숲 거닐기 장소 (장면 기반 이동: 숲길 → 폭포 → 큰 나무 아래)
 * 그림: 쉼표 숲·동굴 통합 자산 v1(가로 약 765×508). 밤 숲과 어울리게 조금 어둡고 청록빛으로 맞춤.
 * 세로 화면에서는 그림 높이에 맞추고 center(그림 가로 위치)를 화면 가운데에 고정 — 카메라가 움직이거나 확대되지 않음.
 * center는 중요한 것(폭포 전체·앉을 자리·나무 풍경)이 모두 보이는 위치. 고해상도 세로 그림을 받으면 image·center만 바꾸면 됨.
 * seat: 그림 속 앉을 수 있는 자리(바위·벤치). 화면에 보일 때만 「잠시 앉기」를 보여 줌
 * 동굴은 지금처럼 숲 첫 화면에서 들어가고, 나중에 숲길 갈림길(branch)로도 연결할 수 있게 자리만 둠.
 */
export type PlaceId = 'path' | 'waterfall' | 'tree';

export type Place = {
  id: PlaceId;
  name: string;
  image: number;
  /** 그림 크기(px) */
  w: number;
  h: number;
  /** 화면 가운데에 고정할 그림 가로 위치(0~1) */
  center: number;
  /** 앉을 자리(그림 비율 좌표, 가운데). 없으면 앉을 수 없음 */
  seat?: { u: number; v: number };
  mix: WalkMix;
  ground: Ground;
  /** 나무 풍경이 매달린 나뭇가지 위치(그림 비율 좌표) */
  chime?: { u: number; v: number };
  branch?: 'cave';
};

export const PLACES: Place[] = [
  {
    id: 'path',
    name: '숲길',
    image: require('../../../assets/forest/walk/path.webp'),
    w: 765,
    h: 506,
    center: 0.5,
    mix: { waterNear: 0, waterFar: 0.35, leaves: 0.45, birdsNear: 0, birdsFar: 0.6 },
    ground: 'leaves',
  },
  {
    id: 'waterfall',
    name: '폭포',
    image: require('../../../assets/forest/walk/waterfall.webp'),
    w: 763,
    h: 506,
    center: 0.6,
    // 폭포 앞 물가의 이끼 낀 바위(그림에 있는 바위 중 가장 평평한 곳)
    seat: { u: 0.5, v: 0.8 },
    mix: { waterNear: 1, waterFar: 0.35, leaves: 0.15, birdsNear: 0, birdsFar: 0.3 },
    ground: 'leaves',
  },
  {
    id: 'tree',
    name: '큰 나무 아래',
    image: require('../../../assets/forest/walk/tree.webp'),
    w: 765,
    h: 508,
    center: 0.72,
    // 나무 아래 나무 벤치(그림에 있음)
    seat: { u: 0.85, v: 0.8 },
    mix: { waterNear: 0, waterFar: 0.15, leaves: 1, birdsNear: 0.9, birdsFar: 0.5 },
    ground: 'leaves',
    chime: { u: 0.62, v: 0.13 },
  },
];

/** 다음 장소로 걸어가는 동안(발소리, 화면은 그대로) */
export const WALK_MS = 1400;
/** 장소 사이 크로스페이드 */
export const FADE_MS = 600;

/** 그림을 화면 높이에 맞춰 놓을 때: center(그림 가로 위치)를 화면 가운데에 */
export function placeCover(p: Place, w: number, h: number, center: number) {
  const k = Math.max(h / p.h, w / p.w);
  const imgW = p.w * k;
  const ox = Math.min(0, Math.max(w - imgW, w / 2 - center * imgW));
  return { k, ox, oy: (h - p.h * k) / 2, imgW, imgH: p.h * k };
}
