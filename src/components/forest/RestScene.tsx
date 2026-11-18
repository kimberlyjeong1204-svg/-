/** 돗자리 펴고 눕기 — iOS 앱은 아직 연결 전(웹은 RestScene.web.tsx) */
type Props = { reduceMotion: boolean; rain: boolean; leaving: boolean; onLeft?: () => void };
export function RestScene({ leaving, onLeft }: Props) {
  if (leaving) onLeft?.();
  return null;
}
