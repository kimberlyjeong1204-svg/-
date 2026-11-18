import { useEffect, useRef } from 'react';
import { Asset } from 'expo-asset';
import { CAVE_IMAGE, CAVE_PAN, CHILD, FIRE, caveCover, easePan } from './caveConfig';
import { createFire } from './fireRenderer';
import { createFireClip } from './fireClip.web';

/**
 * 동굴 화면 (웹앱) — 바위 그림 위에 장작불을 코드로 그립니다.
 * - 불꽃: 아래에서 피어올라 흔들리며 사라지는 빛 입자(노랑→주황→붉은빛), 가끔 불티
 * - 불빛: 불꽃 세기에 따라 일렁이는 따뜻한 빛이 바위를 은은하게 비춤, 멀어질수록 어두움
 * - flare: 값이 바뀌면 몇 초 동안 더 타오름(종이를 태울 때)
 * - 동작 줄이기: 불꽃이 아주 천천히, 일렁임 작게
 * - 화면이 보이지 않으면 그리기를 멈춤
 */
/** paused: 불 가까이 보기가 화면을 다 덮은 동안 그리기를 쉼 */
type Props = { reduceMotion: boolean; flare?: number; paused?: boolean };


export function CaveScene({ reduceMotion, flare = 0, paused = false }: Props) {
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
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
    const fire = createFire(3);
    // 실사 모닥불(멀리서 작게): 그림 속 돌무더기·장작 위에
    const clip = createFireClip();
    let clipOn = false;
    let last = performance.now() / 1000;

    // 들어오면 넓은 동굴을 먼저 보여 주고 장작불 쪽으로 천천히 옮겨 감
    const t0 = performance.now();
    let pan = reduceRef.current ? 1 : 0;
    const drawBg = () => {
      bg.fillStyle = '#07090a';
      bg.fillRect(0, 0, W, H);
      if (!img) return;
      const c = caveCover(W, H, pan);
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
      if (pausedRef.current) return;
      const reduce = reduceRef.current;
      if (pan < 1) {
        pan = reduce ? 1 : easePan(Math.min(1, (performance.now() - t0) / CAVE_PAN.durationMs));
        drawBg();
      }
      const c = caveCover(W, H, pan);
      const f = c.toScreen(FIRE.x, FIRE.y);
      const u = c.k * FIRE.scale * 2.2; // 불빛 범위 단위
      const flareAmt = Math.max(0, 1 - (now - flareAt.current) / 3.2);
      const power = 1 + 0.6 * flareAmt;
      // 불빛 일렁임: 실사 불꽃이 나오면 그 밝기를 따름
      const flick = clipOn ? clip.level() : fire.level();
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

      // 3) 아이·방석에 비치는 불빛 (불 쪽 옆면이 따뜻하게 일렁임)
      const ch = c.toScreen(CHILD.x + CHILD.w * 0.25, CHILD.y);
      fx.globalCompositeOperation = 'lighter';
      g = fx.createRadialGradient(ch.x, ch.y, 0, ch.x, ch.y, CHILD.h * CAVE_IMAGE.height * c.k * 0.75);
      g.addColorStop(0, `rgba(255,150,80,${0.16 * flick * power})`);
      g.addColorStop(1, 'rgba(255,120,60,0)');
      fx.fillStyle = g;
      fx.fillRect(0, 0, W, H);

      // 4) 살아 있는 불꽃 (그림의 멈춘 불꽃은 지운 사본을 씀)
      // 실사 불꽃(가로 약 150 그림 px). 영상이 아직 준비되지 않으면 코드 불꽃으로 대신
      clipOn = clip.draw(fx, f.x, f.y + 6 * c.k, 150 * c.k, power);
      fire.draw(fx, f.x, f.y, c.k * FIRE.scale, now, dt, power, reduce, !clipOn);
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
      clip.dispose();
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
