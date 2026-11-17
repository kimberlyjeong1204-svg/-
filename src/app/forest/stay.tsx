import { WalkWorld } from '../../components/forest/WalkWorld';

/**
 * 숲 거닐기 (예전 「숲에 머물기」 주소 /forest/stay)
 * - 웹: 손가락으로 걷는 1인칭 3D 숲길(WalkWorld.web.tsx) — 숲길 → 폭포 → 큰 나무 아래가 한 공간에 이어져 있음
 * - iOS 앱: 장면 이어 보기(WalkScenes.tsx)
 */
export default function ForestWalk() {
  return <WalkWorld />;
}
