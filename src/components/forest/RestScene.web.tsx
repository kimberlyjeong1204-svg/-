import { useEffect, useRef } from 'react';
import { Asset } from 'expo-asset';
import { FOREST_IMAGE, coverView } from './forestConfig';
import { gustAt, setRainShelter, triggerGust } from './forestFx';

/**
 * 숲에서 「돗자리 펴고 눕기」 (웹, 숲 그림 위에 겹쳐 그림)
 *
 * 숲 첫 화면과 같은 원경 그대로, 그림 속 이끼 언덕(원래 사람이 누워 있던 자리)에서:
 * 걸어 들어온 작은 아이가 돌돌 말린 매트를 내려놓고 밀어 펼친 뒤, 매트 위에 앉았다가 등을 대고 누워 팔다리를 느슨하게 벌림(대자).
 * 누운 뒤에는 숨 쉬는 만큼만 움직임.
 * - 원래 사람: 그 자리만 사람을 지운 조각 그림(rest-patch.webp)을 덮어 아이가 둘로 보이지 않게
 * - 밤의 밝기: 숲은 그대로 짙은 청록, 가지 사이 달빛이 매트와 가장자리 풀에만 옅게
 * - 잔바람: 가끔(15~40초) 가까운 풀잎이 먼저 기울고, 숲의 잎은 조금 늦게(ForestScene) 흔들리다 잦아듦
 * - 비: 아이 머리 위 넓은 가지가 비를 받아 줌(그 아래로는 빗줄기 없음), 잎 끝에서 매트 바깥으로 물방울이 가끔 떨어짐
 * - 작은 생명: 한 번에 하나만, 25~70초에 한 번 — 풀벌레가 풀잎을 옮겨 타거나, 작은 동물이 먼 나무뿌리 사이를 지나감
 * 동작 줄이기: 펼치기·눕기는 바로 끝난 모습, 바람·생명은 아주 드물고 작게.
 */
type Props = { reduceMotion: boolean; rain: boolean; leaving: boolean; onLeft?: () => void };

const PATCH = { src: require('../../../assets/forest/rest-patch.webp'), x: 340, y: 1580, w: 300, h: 200 };
// 매트(그림 px): 왼쪽 끝 L에서 오른쪽 R로 펼쳐짐, 폭(앞뒤) 54
const L = { x: 396, y: 1696 };
const R = { x: 576, y: 1716 };
const MAT_LEN = Math.hypot(R.x - L.x, R.y - L.y);
const AX = { x: (R.x - L.x) / MAT_LEN, y: (R.y - L.y) / MAT_LEN };
const MAT_W = 62;
const S = 1.6; // 아이 크기 배율(휴대폰에서 팔다리가 읽히게)
// 조금 위에서 내려다보는 시점: 앞뒤(z)가 화면에서 보이는 비율
const ZX = 0.32, ZY = 0.62;

type J = [number, number, number]; // 매트 기준 [x(매트 방향), y(위), z(앞쪽)]
type Pose = Record<'head' | 'neck' | 'hip' | 'eL' | 'eR' | 'hL' | 'hR' | 'kL' | 'kR' | 'fL' | 'fR', J>;

const stand = (x: number, hold: boolean): Pose => ({
  head: [x, 93, 0], neck: [x, 82, 0], hip: [x, 50, 0],
  eL: [x + (hold ? 6 : 1), 66, -6], eR: [x + (hold ? 6 : 1), 66, 6],
  hL: [x + (hold ? 10 : 2), hold ? 60 : 48, -5], hR: [x + (hold ? 10 : 2), hold ? 60 : 48, 5],
  kL: [x, 25, -4], kR: [x, 25, 4], fL: [x, 0, -5], fR: [x, 0, 5],
});
const POSES: Record<string, Pose> = {
  crouch: {
    head: [-2, 58, 0], neck: [-6, 50, 0], hip: [-20, 28, 0],
    eL: [-2, 30, -7], eR: [-2, 30, 7], hL: [6, 8, -6], hR: [6, 8, 6],
    kL: [-8, 22, -5], kR: [-8, 22, 5], fL: [-16, 0, -5], fR: [-16, 0, 5],
  },
  push: {
    head: [10, 54, 0], neck: [4, 46, 0], hip: [-14, 26, 0],
    eL: [14, 26, -7], eR: [14, 26, 7], hL: [24, 8, -6], hR: [24, 8, 6],
    kL: [-2, 20, -5], kR: [-2, 20, 5], fL: [-14, 0, -5], fR: [-14, 0, 5],
  },
  sit: {
    head: [36, 48, 0], neck: [38, 38, 0], hip: [42, 6, 0],
    eL: [40, 22, -10], eR: [40, 22, 10], hL: [38, 5, -13], hR: [38, 5, 13],
    kL: [62, 16, -6], kR: [62, 16, 6], fL: [82, 2, -7], fR: [82, 2, 7],
  },
  lie: {
    head: [14, 5, 0], neck: [24, 4, 0], hip: [58, 4, 0],
    eL: [38, 3, -12], eR: [38, 3, 12], hL: [52, 2, -13], hR: [52, 2, 13],
    kL: [82, 3, -5], kR: [82, 3, 5], fL: [104, 2, -5], fR: [104, 2, 5],
  },
  star: {
    head: [14, 5, 0], neck: [24, 4, 0], hip: [58, 4, 0],
    eL: [26, 3, -20], eR: [26, 3, 20], hL: [18, 3, -32], hR: [18, 3, 32],
    kL: [82, 3, -12], kR: [82, 3, 12], fL: [104, 2, -21], fR: [104, 2, 21],
  },
};
const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: Pose, b: Pose, t: number): Pose => {
  const e = ease(Math.max(0, Math.min(1, t)));
  const o = {} as Pose;
  for (const k of Object.keys(a) as (keyof Pose)[]) o[k] = [a[k][0] + (b[k][0] - a[k][0]) * e, a[k][1] + (b[k][1] - a[k][1]) * e, a[k][2] + (b[k][2] - a[k][2]) * e];
  return o;
};

/** 시간표(초): 걸어 들어옴 → 매트 내려놓기 → 밀어 펼치기 → 일어나 매트 위로 → 앉기 → 눕기 → 팔다리 벌리기 */
const T = { walk: 1.6, crouch: 2.3, unroll0: 2.5, unroll1: 4.4, rise: 5.3, sit: 6.3, lie: 7.3, star: 8.2 };

function poseAt(t: number): { pose: Pose; roll: number } {
  if (t < T.walk) {
    const x = -70 + (56 * t) / T.walk;
    const p = stand(x, true);
    const sw = Math.sin(t * 9) * 7; // 걸음
    p.fL = [x + sw, Math.max(0, Math.sin(t * 9)) * 3, -5];
    p.fR = [x - sw, Math.max(0, -Math.sin(t * 9)) * 3, 5];
    p.kL = [x + sw * 0.5, 25, -4];
    p.kR = [x - sw * 0.5, 25, 4];
    return { pose: p, roll: -1 };
  }
  if (t < T.crouch) return { pose: mix(stand(-14, true), POSES.crouch, (t - T.walk) / (T.crouch - T.walk)), roll: -1 };
  if (t < T.unroll1) {
    const u = Math.max(0, (t - T.unroll0) / (T.unroll1 - T.unroll0));
    return { pose: mix(POSES.crouch, POSES.push, Math.min(1, (t - T.crouch) / 0.5)), roll: u };
  }
  if (t < T.rise) {
    const k = (t - T.unroll1) / (T.rise - T.unroll1);
    return { pose: mix(POSES.push, stand(40, false), k), roll: 1 };
  }
  if (t < T.sit) return { pose: mix(stand(40, false), POSES.sit, (t - T.rise) / (T.sit - T.rise)), roll: 1 };
  if (t < T.lie) return { pose: mix(POSES.sit, POSES.lie, (t - T.sit) / (T.lie - T.sit)), roll: 1 };
  return { pose: mix(POSES.lie, POSES.star, (t - T.lie) / (T.star - T.lie)), roll: 1 };
}

/** 매트 기준 좌표 → 그림 px */
const toImg = (j: J) => ({ x: L.x + j[0] * AX.x * S + j[2] * ZX * S, y: L.y + j[0] * AX.y * S - j[1] * S + j[2] * ZY * S });

type Critter = { kind: 'bug' | 'animal'; t0: number; dur: number; seed: number };

export function RestScene({ reduceMotion, rain, leaving, onLeft }: Props) {
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;
  const rainRef = useRef(rain);
  rainRef.current = rain;
  const leavingRef = useRef(leaving);
  leavingRef.current = leaving;
  const leftRef = useRef(onLeft);
  leftRef.current = onLeft;

  useEffect(() => {
    const cv = cvRef.current, box = boxRef.current;
    if (!cv || !box) return;
    const g = cv.getContext('2d');
    if (!g) return;
    let W = 1, H = 1, raf = 0, alive = true;
    let patch: HTMLImageElement | null = null;
    const im = new Image();
    im.onload = () => {
      patch = im;
    };
    im.src = Asset.fromModule(PATCH.src).uri;
    const t0 = performance.now() / 1000 - (reduceRef.current ? T.star : 0);
    let fade = 0; // 들어올 때 조각 그림이 0.6초에 걸쳐 원래 사람을 덮음, 일어날 때 반대로
    let nextGust = t0 + 9 + Math.random() * 10;
    let nextCritter = t0 + 20 + Math.random() * 25;
    let critter: Critter | null = null;
    const drips: { x: number; y: number; vy: number; land: number; age: number }[] = [];
    let nextDrip = 0;
    // 비 가림: 아이 머리 위 가지(그림 좌표)
    setRainShelter({ u0: (L.x - 40) / FOREST_IMAGE.width, u1: (R.x + 30) / FOREST_IMAGE.width, vTop: (L.y - 210) / FOREST_IMAGE.height });

    const layout = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(r.width * dpr));
      H = Math.max(1, Math.round(r.height * dpr));
      cv.width = W;
      cv.height = H;
    };

    const frame = () => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const now = performance.now() / 1000;
      const t = now - t0;
      const reduce = reduceRef.current;
      fade = leavingRef.current ? Math.max(0, fade - 1 / 72) : Math.min(1, fade + 1 / 36);
      if (leavingRef.current && fade <= 0) {
        leftRef.current?.();
        return;
      }
      const view = coverView(W, H);
      const k = W / (view.sx * FOREST_IMAGE.width);
      const sx = (x: number) => (x / FOREST_IMAGE.width - view.ox) / view.sx * W;
      const sy = (y: number) => (y / FOREST_IMAGE.height - view.oy) / view.sy * H;
      g.clearRect(0, 0, W, H);
      g.globalAlpha = fade;

      // 1) 원래 사람을 지운 조각
      if (patch) g.drawImage(patch, sx(PATCH.x), sy(PATCH.y), PATCH.w * k, PATCH.h * k);

      // 2) 달빛: 가지 사이로 스민 옅은 빛이 매트와 가장자리 풀에만
      const mid = { x: (L.x + R.x) / 2, y: (L.y + R.y) / 2 };
      g.globalCompositeOperation = 'lighter';
      let gr = g.createRadialGradient(sx(mid.x), sy(mid.y), 0, sx(mid.x), sy(mid.y), 130 * k);
      gr.addColorStop(0, 'rgba(150,180,195,0.16)');
      gr.addColorStop(0.6, 'rgba(120,160,180,0.06)');
      gr.addColorStop(1, 'rgba(100,140,160,0)');
      g.fillStyle = gr;
      g.fillRect(sx(mid.x) - 140 * k, sy(mid.y) - 140 * k, 280 * k, 280 * k);
      g.globalCompositeOperation = 'source-over';

      // 3) 매트·말린 매트
      const { pose, roll } = reduce ? { pose: POSES.star, roll: 1 } : t > T.star ? { pose: POSES.star, roll: 1 } : poseAt(t);
      const len = roll < 0 ? 0 : roll * MAT_LEN;
      const p = (x: number, z: number) => ({ x: sx(L.x + x * AX.x + z * ZX), y: sy(L.y + x * AX.y + z * ZY) });
      if (len > 1) {
        const a = p(0, -MAT_W / 2), b = p(len, -MAT_W / 2), c = p(len, MAT_W / 2), d = p(0, MAT_W / 2);
        // 바닥에 닿은 옅은 그림자
        g.fillStyle = 'rgba(0,0,0,0.28)';
        g.beginPath();
        g.moveTo(a.x - 2 * k, a.y + 3 * k);
        g.lineTo(b.x + 2 * k, b.y + 3 * k);
        g.lineTo(c.x + 2 * k, c.y + 5 * k);
        g.lineTo(d.x - 2 * k, d.y + 5 * k);
        g.closePath();
        g.fill();
        g.fillStyle = '#7a6655';
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.lineTo(c.x, c.y);
        g.lineTo(d.x, d.y);
        g.closePath();
        g.fill();
        // 달빛을 받은 윗면·두께
        gr = g.createLinearGradient(a.x, a.y, d.x, d.y);
        gr.addColorStop(0, 'rgba(200,215,220,0.16)');
        gr.addColorStop(1, 'rgba(0,0,0,0.12)');
        g.fillStyle = gr;
        g.fill();
        g.strokeStyle = 'rgba(40,32,26,0.7)';
        g.lineWidth = Math.max(1, 1.6 * k);
        g.beginPath();
        g.moveTo(d.x, d.y);
        g.lineTo(c.x, c.y);
        g.stroke();
      }
      const rollR = (14 - 8 * Math.max(0, roll)) * k;
      const rollAt = roll < 0 ? null : roll < 1 ? len : null;
      const held = roll < 0 && t < T.crouch + 0.05;
      const drawRoll = (cx: number, cy: number) => {
        // 말린 매트: 원통(앞쪽 끝은 동그라미, 몸통은 앞뒤로 길게)
        const fr = { x: cx + (MAT_W / 2) * ZX * k, y: cy + (MAT_W / 2) * ZY * k };
        const bk = { x: cx - (MAT_W / 2) * ZX * k, y: cy - (MAT_W / 2) * ZY * k };
        g.strokeStyle = '#5c4b3e';
        g.lineWidth = rollR * 2;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(bk.x, bk.y);
        g.lineTo(fr.x, fr.y);
        g.stroke();
        g.fillStyle = '#86705e';
        g.beginPath();
        g.ellipse(fr.x, fr.y, rollR * 0.75, rollR, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(50,40,32,0.8)';
        g.lineWidth = Math.max(1, k);
        g.beginPath();
        g.ellipse(fr.x, fr.y, rollR * 0.4, rollR * 0.55, 0, 0, Math.PI * 1.6);
        g.stroke();
      };
      if (held) {
        const hp = toImg(pose.hL);
        drawRoll(sx(hp.x), sy(hp.y));
      } else if (rollAt != null) {
        const c = p(rollAt, 0);
        drawRoll(c.x, c.y - rollR * 0.6);
      }

      // 4) 아이(작은 실루엣, 달빛 가장자리)
      const breath = t > T.star && !reduce ? Math.sin(now * 1.3) * 0.5 : 0;
      const q = (j: J, lift = 0) => {
        const v = toImg([j[0], j[1] + lift, j[2]]);
        return { x: sx(v.x), y: sy(v.y) };
      };
      const limb = (a: J, b: J, c: J, w: number, col: string) => {
        const A = q(a), B = q(b), C = q(c);
        g.strokeStyle = col;
        g.lineWidth = Math.max(1.2, w * k * S);
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.beginPath();
        g.moveTo(A.x, A.y);
        g.lineTo(B.x, B.y);
        g.lineTo(C.x, C.y);
        g.stroke();
      };
      const cloth = '#a9a497', clothLit = '#d6d3c8', skin = '#b39a86', hair = '#2e231c', pants = '#7c776c';
      // 뒤쪽 팔다리 → 몸 → 앞쪽 팔다리
      limb(pose.hip, pose.kL, pose.fL, 4.6, pants);
      limb(pose.neck, pose.eL, pose.hL, 3.6, cloth);
      const Nk = q(pose.neck, breath), Hp = q(pose.hip);
      g.strokeStyle = cloth;
      g.lineWidth = Math.max(2, 9.5 * k * S);
      g.beginPath();
      g.moveTo(Nk.x, Nk.y);
      g.lineTo(Hp.x, Hp.y);
      g.stroke();
      // 달빛 받은 윗선
      g.strokeStyle = clothLit;
      g.lineWidth = Math.max(1, 3 * k * S);
      g.beginPath();
      g.moveTo(Nk.x, Nk.y - 3 * k * S);
      g.lineTo(Hp.x, Hp.y - 3 * k * S);
      g.stroke();
      limb(pose.hip, pose.kR, pose.fR, 4.6, pants);
      limb(pose.neck, pose.eR, pose.hR, 3.6, cloth);
      // 손·발 끝
      for (const j of [pose.hL, pose.hR]) {
        const P = q(j);
        g.fillStyle = skin;
        g.beginPath();
        g.arc(P.x, P.y, Math.max(1, 2 * k * S), 0, Math.PI * 2);
        g.fill();
      }
      // 머리(머리카락 + 얼굴 쪽 살짝)
      const Hd = q(pose.head, breath * 0.5);
      g.fillStyle = hair;
      g.beginPath();
      g.arc(Hd.x, Hd.y, Math.max(2, 8 * k * S), 0, Math.PI * 2);
      g.fill();
      g.fillStyle = skin;
      g.beginPath();
      g.arc(Hd.x + 2.5 * k * S, Hd.y - 1.5 * k * S, Math.max(1, 4 * k * S), 0, Math.PI * 2);
      g.fill();

      // 5) 가까운 풀잎(매트 앞쪽 가장자리): 바람에 먼저 기움
      const gust = gustAt(now);
      g.strokeStyle = 'rgba(70,110,70,0.85)';
      g.lineCap = 'round';
      for (let i = 0; i < 26; i++) {
        const bx = -18 + i * 8.5 + ((i * 37) % 7);
        const base = p(bx, MAT_W / 2 + 6 + ((i * 13) % 9));
        const h = (10 + ((i * 29) % 9)) * k;
        const lean = (reduce ? 0 : Math.sin(now * 1.1 + i) * 0.08) + gust * (0.55 + 0.2 * Math.sin(i));
        g.lineWidth = Math.max(1, 1.4 * k);
        g.beginPath();
        g.moveTo(base.x, base.y);
        g.quadraticCurveTo(base.x + lean * h * 0.4, base.y - h * 0.6, base.x + lean * h, base.y - h);
        g.stroke();
      }
      if (!reduce && now > nextGust) {
        triggerGust(0.7 + Math.random() * 0.3);
        nextGust = now + 15 + Math.random() * 25;
      }

      // 6) 비: 잎 끝에서 매트 바깥으로 물방울이 가끔
      if (rainRef.current && !reduce) {
        if (now > nextDrip) {
          const side = Math.random() < 0.5 ? -24 - Math.random() * 20 : MAT_LEN + 14 + Math.random() * 24;
          const land = p(side, (Math.random() - 0.5) * MAT_W);
          drips.push({ x: land.x, y: land.y - 120 * k, vy: 0, land: land.y, age: 0 });
          nextDrip = now + 0.6 + Math.random() * 2.2;
        }
        for (let i = drips.length - 1; i >= 0; i--) {
          const d = drips[i];
          d.age += 1 / 60;
          if (d.y < d.land) {
            d.vy += 900 * k * (1 / 60);
            d.y += d.vy * (1 / 60);
            g.fillStyle = 'rgba(210,228,232,0.75)';
            g.fillRect(d.x, d.y, Math.max(1, 1.2 * k), Math.max(2, 4 * k));
          } else {
            const a = Math.max(0, 1 - (d.age - (d.land - d.y) / 1000) * 3);
            g.strokeStyle = `rgba(210,228,232,${0.5 * a})`;
            g.lineWidth = 1;
            g.beginPath();
            g.ellipse(d.x, d.land, 3 * k, 1.2 * k, 0, 0, Math.PI * 2);
            g.stroke();
            if (a <= 0) drips.splice(i, 1);
          }
        }
      }

      // 7) 작은 생명: 한 번에 하나, 가끔
      if (!critter && now > nextCritter && t > T.star) {
        critter = { kind: Math.random() < 0.6 ? 'bug' : 'animal', t0: now, dur: 0, seed: Math.random() };
        critter.dur = critter.kind === 'bug' ? 6 : 11;
      }
      if (critter) {
        const ct = (now - critter.t0) / critter.dur;
        if (ct >= 1) {
          critter = null;
          nextCritter = now + (reduce ? 80 : 25) + Math.random() * 45;
        } else if (critter.kind === 'bug') {
          // 매트 앞 풀잎 사이를 세 번 옮겨 탐(아이 쪽으로 가지 않음)
          const hops = [MAT_LEN + 20, MAT_LEN + 4, MAT_LEN - 18, MAT_LEN - 34];
          const i = Math.min(2, Math.floor(ct * 3));
          const f = ct * 3 - i;
          const a = p(hops[i], MAT_W / 2 + 12), b = p(hops[i + 1], MAT_W / 2 + 12);
          const jump = f > 0.7 ? (f - 0.7) / 0.3 : 0;
          const x = a.x + (b.x - a.x) * jump, y = a.y + (b.y - a.y) * jump - Math.sin(Math.PI * jump) * 10 * k - 8 * k;
          g.fillStyle = 'rgba(30,40,28,0.95)';
          g.beginPath();
          g.ellipse(x, y, 2.6 * k, 1.3 * k, -0.3, 0, Math.PI * 2);
          g.fill();
        } else {
          // 작은 동물: 먼 나무뿌리 사이(오른쪽 위 깊은 곳)를 천천히 지나감
          const x0 = 780, x1 = 980, y0 = 1560;
          const x = x0 + (x1 - x0) * ct;
          const hop = Math.abs(Math.sin(ct * Math.PI * 8)) * 3;
          const X = sx(x), Y = sy(y0 - hop);
          g.fillStyle = 'rgba(14,20,18,0.9)';
          g.beginPath();
          g.ellipse(X, Y, 7 * k, 4.2 * k, 0, 0, Math.PI * 2);
          g.fill();
          g.beginPath();
          g.arc(X + 6 * k, Y - 3 * k, 3 * k, 0, Math.PI * 2);
          g.fill();
          g.beginPath();
          g.ellipse(X + 6.5 * k, Y - 7.5 * k, 1 * k, 3 * k, 0.2, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.globalAlpha = 1;
    };

    layout();
    raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(layout);
    ro.observe(box);
    (window as unknown as { __shimpyoRest?: () => unknown }).__shimpyoRest = () => ({ t: performance.now() / 1000 - t0, laid: performance.now() / 1000 - t0 > T.star, critter: critter?.kind ?? null, gust: gustAt(performance.now() / 1000) });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      setRainShelter(null);
      delete (window as unknown as { __shimpyoRest?: unknown }).__shimpyoRest;
    };
  }, []);

  return (
    <div ref={boxRef} style={boxStyle} aria-hidden="true">
      <canvas ref={cvRef} style={canvasStyle} />
    </div>
  );
}

const boxStyle = { position: 'absolute', inset: 0, pointerEvents: 'none' } as const;
const canvasStyle = { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const;
