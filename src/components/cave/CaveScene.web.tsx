import { useEffect, useRef } from 'react';
import { Asset } from 'expo-asset';
import { CAVE_IMAGE, FIRE, caveCover } from './caveConfig';

/**
 * 동굴 화면 (웹앱) — 바위 그림 위에 장작불을 코드로 그립니다.
 * - 불꽃: 아래에서 피어올라 흔들리며 사라지는 빛 입자(노랑→주황→붉은빛), 가끔 불티
 * - 불빛: 불꽃 세기에 따라 일렁이는 따뜻한 빛이 바위를 은은하게 비춤, 멀어질수록 어두움
 * - flare: 값이 바뀌면 몇 초 동안 더 타오름(종이를 태울 때)
 * - 동작 줄이기: 불꽃이 아주 천천히, 일렁임 작게
 * - 화면이 보이지 않으면 그리기를 멈춤
 */
type Props = { reduceMotion: boolean; flare?: number };

type P = { x: number; y: number; vx: number; vy: number; life: number; age: number; size: number; spark: boolean };

export function CaveScene({ reduceMotion, flare = 0 }: Props) {
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const fxRef = useRef<HTMLCanvasElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;
  const flareAt = useRef(0);
  useEffect(() => {
    if (flare) flareAt.current = performance.now() / 1000;
  }, [flare]);

  useEffect(() => {
    const bgC = bgRef.current, fxC = fxRef.current, box = boxRef.current;
    if (!bgC || !fxC || !box) return;
    const bg = bgC.getContext('2d'), fx = fxC.getContext('2d');
    if (!bg || !fx) return;
    let W = 1, H = 1, dpr = 1, raf = 0, alive = true;
    let img: HTMLImageElement | null = null;
    const parts: P[] = [];
    let last = performance.now() / 1000;
    let flick = 1;

    const drawBg = () => {
      bg.fillStyle = '#07090a';
      bg.fillRect(0, 0, W, H);
      if (!img) return;
      const c = caveCover(W, H);
      bg.drawImage(img, c.ox, c.oy, CAVE_IMAGE.width * c.k, CAVE_IMAGE.height * c.k);
    };
    const layout = () => {
      const r = box.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(r.width * dpr));
      H = Math.max(1, Math.round(r.height * dpr));
      bgC.width = fxC.width = W;
      bgC.height = fxC.height = H;
      drawBg();
    };

    const frame = () => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const now = performance.now() / 1000;
      const dt = Math.min(0.05, now - last);
      last = now;
      const reduce = reduceRef.current;
      const c = caveCover(W, H);
      const f = c.toScreen(FIRE.x, FIRE.y);
      const u = (W / 800) * FIRE.scale; // 화면 크기 기준 단위
      const flareAmt = Math.max(0, 1 - (now - flareAt.current) / 3.2);
      const power = 1 + 0.9 * flareAmt;
      // 일렁임: 느린 물결 + 빠른 떨림, 부드럽게
      const target = reduce ? 1 : 0.86 + 0.08 * Math.sin(now * 1.7) + 0.05 * Math.sin(now * 4.3 + 1) + 0.06 * (Math.random() - 0.5);
      flick += (target - flick) * Math.min(1, dt * 8);
      const glow = flick * power;

      fx.clearRect(0, 0, W, H);
      // 1) 바위를 비추는 따뜻한 불빛
      fx.globalCompositeOperation = 'lighter';
      let g = fx.createRadialGradient(f.x, f.y - 40 * u, 0, f.x, f.y - 40 * u, 620 * u * (0.9 + 0.15 * glow));
      g.addColorStop(0, `rgba(255,150,70,${0.34 * glow})`);
      g.addColorStop(0.35, `rgba(200,95,40,${0.16 * glow})`);
      g.addColorStop(1, 'rgba(120,50,20,0)');
      fx.fillStyle = g;
      fx.fillRect(0, 0, W, H);
      // 2) 불에서 먼 곳은 더 어둡게 (아늑한 어둠)
      fx.globalCompositeOperation = 'source-over';
      g = fx.createRadialGradient(f.x, f.y - 80 * u, 160 * u, f.x, f.y - 80 * u, 900 * u);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(2,3,4,${0.62 - 0.08 * glow})`);
      fx.fillStyle = g;
      fx.fillRect(0, 0, W, H);

      // 3) 장작더미(임시 그림일 때만)
      if (CAVE_IMAGE.temporary) {
        fx.save();
        fx.translate(f.x, f.y + 8 * u);
        for (const [rot, len] of [[-0.35, 150], [0.38, 140], [0.05, 120]] as const) {
          fx.save();
          fx.rotate(rot);
          const lg = fx.createLinearGradient(0, -12 * u, 0, 12 * u);
          lg.addColorStop(0, '#3a2a1e');
          lg.addColorStop(1, '#140d08');
          fx.fillStyle = lg;
          fx.beginPath();
          fx.roundRect(-len * u * 0.5, -11 * u, len * u, 22 * u, 10 * u);
          fx.fill();
          fx.restore();
        }
        g = fx.createRadialGradient(0, 0, 0, 0, 0, 70 * u);
        g.addColorStop(0, `rgba(255,120,40,${0.55 * glow})`);
        g.addColorStop(1, 'rgba(255,80,20,0)');
        fx.globalCompositeOperation = 'lighter';
        fx.fillStyle = g;
        fx.fillRect(-70 * u, -70 * u, 140 * u, 140 * u);
        fx.restore();
      }

      // 4) 불꽃 입자
      fx.globalCompositeOperation = 'lighter';
      const spawn = (reduce ? 18 : 70) * power * dt * 10;
      for (let i = 0; i < spawn; i++) {
        const spark = Math.random() < 0.025 * power;
        parts.push({
          x: f.x + (Math.random() - 0.5) * 70 * u,
          y: f.y - 6 * u,
          vx: (Math.random() - 0.5) * (spark ? 60 : 18) * u,
          vy: -(spark ? 160 + Math.random() * 120 : 60 + Math.random() * 70) * u * (reduce ? 0.4 : 1),
          life: spark ? 1.4 + Math.random() : 0.55 + Math.random() * 0.5,
          age: 0,
          size: spark ? 1.6 * u : (14 + Math.random() * 14) * u * (0.85 + 0.25 * power),
          spark,
        });
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.age > p.life) {
          parts.splice(i, 1);
          continue;
        }
        const t = p.age / p.life;
        p.x += (p.vx + Math.sin(now * 3 + p.y * 0.02) * 12 * u) * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98;
        if (p.spark) {
          fx.fillStyle = `rgba(255,${190 - 80 * t},90,${(1 - t) * 0.9})`;
          fx.fillRect(p.x, p.y, p.size * 1.4, p.size * 1.4);
          continue;
        }
        const r = p.size * (1 - 0.65 * t);
        const a = (1 - t) * (t < 0.15 ? t / 0.15 : 1) * 0.5;
        const col = t < 0.3 ? [255, 214, 140] : t < 0.6 ? [255, 140, 60] : [190, 60, 30];
        g = fx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`);
        g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
        fx.fillStyle = g;
        fx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      }
      if (parts.length > 600) parts.splice(0, parts.length - 600);
      fx.globalCompositeOperation = 'source-over';
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now() / 1000;
        raf = requestAnimationFrame(frame);
      }
    };

    const im = new Image();
    im.onload = () => {
      img = im;
      drawBg();
    };
    im.src = Asset.fromModule(CAVE_IMAGE.source).uri;
    layout();
    raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(layout);
    ro.observe(box);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div ref={boxRef} style={boxStyle} aria-hidden="true">
      <canvas ref={bgRef} style={canvasStyle} />
      <canvas ref={fxRef} style={canvasStyle} />
    </div>
  );
}

const boxStyle = { position: 'absolute', inset: 0, overflow: 'hidden', background: '#07090a' } as const;
const canvasStyle = { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const;
