import type { Ground, WalkMix } from '../../audio/walkSound';

/**
 * 숲 거닐기 장소 (장면 기반 이동: 숲길 → 폭포 → 큰 나무 아래)
 * 최종 장소 그림·녹음을 받으면 이 파일의 image·mix만 바꾸면 됩니다.
 * - image가 null이면 지금 숲 장면(움직이는 숲 그림)을 그대로 씀
 * - temporary: 임시 그림이면 true (완료 처리하지 않음)
 * - mix: 장소에서 들리는 소리(숲 기본 자연음 위에 더해짐). 이동하는 동안 다음 장소 소리로 천천히 바뀜
 * - 동굴은 지금처럼 숲 첫 화면에서 들어가고, 나중에 숲길의 갈림길(branch)로도 연결할 수 있게 자리만 둠
 */
export type PlaceId = 'path' | 'waterfall' | 'tree';

export type Place = {
  id: PlaceId;
  name: string;
  image: number | null;
  temporary: boolean;
  mix: WalkMix;
  ground: Ground;
  /** 앉을 수 있는 곳 */
  canSit: boolean;
  /** 큰 나무 아래: 나무 풍경이 매달린 가로 위치(0~1). 없으면 풍경 없음 */
  chimeX?: number;
  /** 갈림길(나중에 동굴 등) */
  branch?: 'cave';
};

export const PLACES: Place[] = [
  { id: 'path', name: '숲길', image: null, temporary: false, mix: { water: 0.18, leaves: 0.25, birdsNear: 0, birdsFar: 0.35 }, ground: 'leaves', canSit: false },
  {
    id: 'waterfall',
    name: '폭포',
    image: require('../../../assets/forest/walk/waterfall-temp.webp'),
    temporary: true,
    mix: { water: 1, leaves: 0.1, birdsNear: 0, birdsFar: 0.2 },
    ground: 'leaves',
    canSit: true,
  },
  {
    id: 'tree',
    name: '큰 나무 아래',
    image: require('../../../assets/forest/walk/bigtree-temp.webp'),
    temporary: true,
    mix: { water: 0.08, leaves: 0.85, birdsNear: 0.8, birdsFar: 0.5 },
    ground: 'leaves',
    canSit: true,
    chimeX: 0.66,
  },
];

/** 한 장소에서 다음 장소까지 걷는 시간 */
export const WALK_MS = 4200;
