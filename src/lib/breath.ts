/**
 * 숨 고르기 리듬 계산 (순수 함수)
 *
 * - 들이쉬기가 짧고 내쉬기가 깁니다.
 * - 숨을 참는 구간은 없습니다. 원은 가장 커진 순간 바로 작아지기 시작합니다.
 * - 화면과 타이머가 같은 경과 시간(ms)에서 값을 계산하므로 일시정지·재개해도 어긋나지 않습니다.
 */

export type RhythmKey = 'base' | 'slow';

export type Rhythm = {
  key: RhythmKey;
  label: string;
  inhaleMs: number;
  exhaleMs: number;
};

export const RHYTHMS: Record<RhythmKey, Rhythm> = {
  base: { key: 'base', label: '기본 · 3초 / 5초', inhaleMs: 3000, exhaleMs: 5000 },
  slow: { key: 'slow', label: '느리게 · 4초 / 6초', inhaleMs: 4000, exhaleMs: 6000 },
};

export const MIN_SCALE = 0.7;
export const MAX_SCALE = 1;

/** CSS cubic-bezier(x1, y1, x2, y2)와 같은 곡선. t(0~1) → 진행도(0~1) */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // 뉴턴 방법으로 x에 해당하는 t를 찾고, 실패하면 이분법으로 보정합니다.
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return sampleY(t);
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      const v = sampleX(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

/** 들이쉬기: 고르게 커짐 */
const easeInhale = cubicBezier(0.42, 0, 0.58, 1);
/** 내쉬기: 처음에 조금 움직이고, 끝으로 갈수록 아주 천천히 작아짐 */
const easeExhale = cubicBezier(0.3, 0, 0.15, 1);

export type BreathFrame = {
  inhaling: boolean;
  /** 몇 번째 호흡인지 (0부터) */
  cycle: number;
  /** 원 크기 (MIN_SCALE ~ MAX_SCALE) */
  scale: number;
  /** 0 = 가장 작음, 1 = 가장 큼 */
  fullness: number;
  /** 내쉬는 동안 바깥으로 퍼지며 옅어지는 테두리 */
  haloOpacity: number;
  haloScale: number;
};

export function breathFrame(elapsedMs: number, rhythm: Rhythm): BreathFrame {
  const period = rhythm.inhaleMs + rhythm.exhaleMs;
  const ms = Math.max(0, elapsedMs);
  const cycle = Math.floor(ms / period);
  const t = ms - cycle * period;

  if (t < rhythm.inhaleMs) {
    const p = easeInhale(t / rhythm.inhaleMs);
    return {
      inhaling: true,
      cycle,
      fullness: p,
      scale: MIN_SCALE + (MAX_SCALE - MIN_SCALE) * p,
      haloOpacity: 0.55 * p,
      haloScale: 1,
    };
  }

  const q = easeExhale((t - rhythm.inhaleMs) / rhythm.exhaleMs);
  return {
    inhaling: false,
    cycle,
    fullness: 1 - q,
    scale: MAX_SCALE - (MAX_SCALE - MIN_SCALE) * q,
    haloOpacity: 0.55 * (1 - q),
    haloScale: 1 + 0.22 * q,
  };
}

export const CUE_INHALE = '편안하게 들이쉬어요';
export const CUE_EXHALE = '긴장을 내려놓듯,\n천천히 내쉬어요';

export function idleCue(rhythm: Rhythm): string {
  return `들이쉬기 ${rhythm.inhaleMs / 1000}초\n내쉬기 ${rhythm.exhaleMs / 1000}초`;
}
