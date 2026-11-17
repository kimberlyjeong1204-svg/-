import type { Ground, WalkMix } from '../../audio/walkSound';

/**
 * 숲 거닐기 장소 (장면 기반 이동: 숲길 → 폭포 → 큰 나무 아래)
 * 그림: 쉼표 숲·동굴 통합 자산 v1(가로 약 765×508). 밤 숲과 어울리게 조금 어둡고 청록빛으로 맞춤.
 * 세로 화면에서는 그림 높이에 맞추고(가로는 잘림), 도착하면 panFrom → panTo로 천천히 옮겨 가며 장면 전체를 보여 줌.
 * 중요한 것(폭포·나무 풍경)이 잘리지 않도록 panTo를 그 쪽에 둠. 고해상도 세로 그림을 받으면 image만 바꾸면 됨.
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
  /** 화면 가운데에 올 그림 가로 위치(0~1): 도착할 때 panFrom에서 panTo로 */
  panFrom: number;
  panTo: number;
  mix: WalkMix;
  ground: Ground;
  canSit: boolean;
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
    panFrom: 0.38,
    panTo: 0.5,
    mix: { waterNear: 0, waterFar: 0.35, leaves: 0.45, birdsNear: 0, birdsFar: 0.6 },
    ground: 'leaves',
    canSit: false,
  },
  {
    id: 'waterfall',
    name: '폭포',
    image: require('../../../assets/forest/walk/waterfall.webp'),
    w: 763,
    h: 506,
    panFrom: 0.4,
    panTo: 0.63,
    mix: { waterNear: 1, waterFar: 0.35, leaves: 0.15, birdsNear: 0, birdsFar: 0.3 },
    ground: 'leaves',
    canSit: true,
  },
  {
    id: 'tree',
    name: '큰 나무 아래',
    image: require('../../../assets/forest/walk/tree.webp'),
    w: 765,
    h: 508,
    panFrom: 0.3,
    panTo: 0.52,
    mix: { waterNear: 0, waterFar: 0.15, leaves: 1, birdsNear: 0.9, birdsFar: 0.5 },
    ground: 'leaves',
    canSit: true,
    chime: { u: 0.62, v: 0.13 },
  },
];

/** 한 장소에서 다음 장소까지 걷는 시간 */
export const WALK_MS = 4200;
/** 도착한 뒤 장면을 천천히 둘러보는 시간 */
export const LOOK_MS = 6000;

/** 그림을 화면 높이에 맞춰 놓을 때: center(그림 가로 위치)를 화면 가운데에 */
export function placeCover(p: Place, w: number, h: number, center: number) {
  const k = Math.max(h / p.h, w / p.w);
  const imgW = p.w * k;
  const ox = Math.min(0, Math.max(w - imgW, w / 2 - center * imgW));
  return { k, ox, oy: (h - p.h * k) / 2, imgW, imgH: p.h * k };
}
