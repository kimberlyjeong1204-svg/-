import { useEffect, useRef } from 'react';
import { Asset } from 'expo-asset';
import { FOREST_IMAGE, coverView } from './forestConfig';
import { gustAt, setRainShelter, triggerGust } from './forestFx';

/**
 * 숲에서 「돗자리 펴고 눕기」 (웹, 숲 그림 위에 겹쳐 그림)
 *
 * 숲 첫 화면과 같은 원경 그대로, 그림 속 여자아이가 쉬던 이끼 언덕에서:
 * 돌돌 말린 매트가 놓여 펼쳐지고, 그림 속 그 여자아이(오려 낸 그대로, rest-girl.png)가 매트 위에 눕는다. 누운 뒤에는 숨 쉬는 만큼만.
 * - 매트가 펼쳐지는 동안은 아이가 없는 언덕(rest-patch.webp)을 보여 주고, 아이는 한 명만 보임
 * - 밤의 밝기: 숲은 그대로 짙은 청록, 가지 사이 달빛이 매트와 가장자리 풀에만 옅게
 * - 잔바람: 가끔(15~40초) 가까운 풀잎이 먼저 기울고, 숲의 잎은 조금 늦게(ForestScene) 흔들리다 잦아듦
 * - 비: 아이 머리 위 넓은 가지가 비를 받아 줌(그 아래로는 빗줄기 없음), 잎 끝에서 매트 바깥으로 물방울이 가끔 떨어짐
 * - 작은 생명: 한 번에 하나만, 25~70초에 한 번 — 풀벌레가 풀잎을 옮겨 타거나, 작은 동물이 먼 나무뿌리 사이를 지나감
 * 동작 줄이기: 펼치기·눕기는 바로 끝난 모습, 바람·생명은 아주 드물고 작게.
 */
type Props = { reduceMotion: boolean; rain: boolean; leaving: boolean; onLeft?: () => void };

const PATCH = { src: require('../../../assets/forest/rest-patch.webp'), x: 340, y: 1580, w: 300, h: 200 };
/** 그림 속 여자아이를 그대로 오려 낸 조각(같은 자리에 다시 그림) */
const GIRL = { src: require('../../../assets/forest/rest-girl.png'), x: 360, y: 1600, w: 260, h: 160 };
// 매트(그림 px): 아이 등 아래 이끼 언덕을 따라 머리 쪽 L에서 발 쪽 R로 펼쳐짐
const L = { x: 378, y: 1690 };
const R = { x: 588, y: 1730 };
const MAT_LEN = Math.hypot(R.x - L.x, R.y - L.y);
const AX = { x: (R.x - L.x) / MAT_LEN, y: (R.y - L.y) / MAT_LEN };
const MAT_W = 44;
// 조금 위에서 내려다보는 시점: 매트 폭(앞뒤)이 화면에서 보이는 비율
const ZX = 0.22, ZY = 0.42;
/** 시간표(초): 말린 매트가 놓임 → 펼쳐짐 → 아이가 매트에 누움 */
const T = { roll: 0.5, unroll0: 0.7, unroll1: 2.6, lie0: 2.7, lie1: 4.0 };
const ease = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

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
    let girl: HTMLImageElement | null = null;
    const gi = new Image();
    gi.onload = () => {
      girl = gi;
    };
    gi.src = Asset.fromModule(GIRL.src).uri;
    const t0 = performance.now() / 1000 - (reduceRef.current ? T.lie1 : 0);
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

      // 3) 매트: 말린 매트가 놓였다가 발 쪽으로 펼쳐짐
      const tt = reduce ? T.lie1 : t;
      const roll = tt < T.unroll0 ? 0 : Math.min(1, ease((tt - T.unroll0) / (T.unroll1 - T.unroll0)));
      const rollIn = Math.min(1, tt / T.roll);
      const len = roll * MAT_LEN;
      const p = (x: number, z: number) => ({ x: sx(L.x + x * AX.x + z * ZX), y: sy(L.y + x * AX.y + z * ZY) });
      if (len > 2) {
        const r = 5 * k; // 둥근 모서리
        const a = p(0, -MAT_W / 2), b = p(len, -MAT_W / 2), c = p(len, MAT_W / 2), d = p(0, MAT_W / 2);
        const quad = (o: number) => {
          g.beginPath();
          g.moveTo(a.x + r, a.y + o);
          g.lineTo(b.x - r, b.y + o);
          g.quadraticCurveTo(b.x, b.y + o, b.x + (c.x - b.x) * 0.2, b.y + o + (c.y - b.y) * 0.2);
          g.lineTo(c.x - (c.x - b.x) * 0.2, c.y + o - (c.y - b.y) * 0.2);
          g.quadraticCurveTo(c.x, c.y + o, c.x - r, c.y + o);
          g.lineTo(d.x + r, d.y + o);
          g.quadraticCurveTo(d.x, d.y + o, d.x + (a.x - d.x) * 0.2, d.y + o + (a.y - d.y) * 0.2);
          g.lineTo(a.x - (a.x - d.x) * 0.2, a.y + o - (a.y - d.y) * 0.2);
          g.quadraticCurveTo(a.x, a.y + o, a.x + r, a.y + o);
          g.closePath();
        };
        // 바닥에 닿은 그림자 → 두께(옆면) → 윗면
        g.fillStyle = 'rgba(0,0,0,0.3)';
        quad(4 * k);
        g.fill();
        g.fillStyle = '#352d28';
        quad(1.6 * k);
        g.fill();
        gr = g.createLinearGradient(a.x, a.y, d.x, d.y);
        gr.addColorStop(0, '#5b4f46');
        gr.addColorStop(1, '#4a4039');
        g.fillStyle = gr;
        quad(0);
        g.fill();
        // 달빛을 받은 위쪽 가장자리
        g.strokeStyle = 'rgba(170,195,205,0.18)';
        g.lineWidth = Math.max(1, 1.2 * k);
        g.beginPath();
        g.moveTo(a.x + r, a.y);
        g.lineTo(b.x - r, b.y);
        g.stroke();
      }
      // 말린 매트(펼쳐지는 끝에서 굴러가며 작아짐)
      if (roll < 1) {
        const rollR = (9 - 6 * roll) * k;
        const c0 = p(len, 0);
        const fr = { x: c0.x + (MAT_W / 2) * ZX * k, y: c0.y + (MAT_W / 2) * ZY * k - rollR * 0.7 };
        const bk = { x: c0.x - (MAT_W / 2) * ZX * k, y: c0.y - (MAT_W / 2) * ZY * k - rollR * 0.7 };
        g.globalAlpha = fade * rollIn;
        g.strokeStyle = '#463b33';
        g.lineWidth = rollR * 2;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(bk.x, bk.y);
        g.lineTo(fr.x, fr.y);
        g.stroke();
        g.fillStyle = '#5c4f45';
        g.beginPath();
        g.ellipse(fr.x, fr.y, rollR * 0.8, rollR, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(40,32,26,0.7)';
        g.lineWidth = Math.max(1, 0.8 * k);
        g.beginPath();
        g.ellipse(fr.x, fr.y, rollR * 0.45, rollR * 0.55, 0, 0, Math.PI * 1.7);
        g.stroke();
        g.globalAlpha = fade;
      }

      // 4) 그림 속 여자아이가 매트 위에 누움(살짝 내려앉으며 나타남), 누운 뒤에는 숨 쉬는 만큼만
      const lie = tt < T.lie0 ? 0 : Math.min(1, ease((tt - T.lie0) / (T.lie1 - T.lie0)));
      if (girl && lie > 0) {
        const breath = lie >= 1 && !reduce ? Math.sin(now * 1.3) * 0.004 : 0;
        const gx = sx(GIRL.x), gy = sy(GIRL.y) - (1 - lie) * 7 * k;
        const gw = GIRL.w * k, gh = GIRL.h * k;
        g.globalAlpha = fade * lie;
        g.save();
        // 숨: 등을 기준으로 아주 조금 부풂
        g.translate(gx, gy + gh * 0.75);
        g.scale(1, 1 + breath);
        g.drawImage(girl, 0, -gh * 0.75, gw, gh);
        g.restore();
        g.globalAlpha = fade;
      }

      // 5) 가까운 풀잎(매트 앞쪽 가장자리): 바람에 먼저 기움
      const gust = gustAt(now);
      g.strokeStyle = 'rgba(40,70,45,0.55)';
      g.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const bx = -14 + i * 16 + ((i * 37) % 11);
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
      if (!critter && now > nextCritter && t > T.lie1) {
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
    (window as unknown as { __shimpyoRest?: () => unknown }).__shimpyoRest = () => ({ t: performance.now() / 1000 - t0, laid: performance.now() / 1000 - t0 > T.lie1, critter: critter?.kind ?? null, gust: gustAt(performance.now() / 1000) });
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
