import { useEffect, useRef } from 'react';
import { Asset } from 'expo-asset';
import { FIRE_VIDEO } from './caveConfig';
import { createFire, drawEmberBed, drawStones, type Log } from './fireRenderer';

/**
 * 불 가까이 보기(불멍) — 웹
 * - 돌로 둘러싼 장작불을 가까이서 봄. 불꽃·불씨·불티는 계속 살아 움직이고(끝없이 반복, 같은 모양 되풀이 없음)
 *   주변 돌과 재가 불빛에 일렁임
 * - addLog 값이 바뀌면 장작 하나가 화면 아래에서 불 안으로 들어감 → 닿는 순간 onLand(소리), 불꽃이 잠깐 커지고 불티가 오름,
 *   몇 초에 걸쳐 원래 크기로. 넣은 장작은 천천히 숯이 되고, 많아지면 가장 오래된 것부터 사그라듦(최대 3개)
 * - 장작을 넣지 않아도 불은 계속 탐
 * - FIRE_VIDEO(실제 불꽃 영상)가 있으면 영상 위에 장작 넣기만 그림
 * - 화면이 보이지 않으면 그리기를 멈춤
 */
type Props = { reduceMotion: boolean; addLog: number; onLand?: () => void };

const BASE_LOGS: Log[] = [
  { x: -46, y: 4, angle: -0.32, len: 190, thick: 34, char: 0.65, seed: 11 },
  { x: 44, y: 6, angle: 0.36, len: 180, thick: 32, char: 0.6, seed: 23 },
  { x: -6, y: -14, angle: 0.08, len: 170, thick: 30, char: 0.75, seed: 37 },
  { x: 8, y: 22, angle: -0.06, len: 200, thick: 36, char: 0.5, seed: 41 },
];
const REST = [
  { x: -24, y: -24, angle: -0.5 },
  { x: 30, y: -20, angle: 0.55 },
  { x: 0, y: -32, angle: -0.15 },
];
const FLY_MS = 900;

type Added = Log & { born: number; fadeFrom?: number };
type Flying = { t0: number; rest: { x: number; y: number; angle: number }; seed: number };

export function FireCloseup({ reduceMotion, addLog, onLand }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;
  const landRef = useRef(onLand);
  landRef.current = onLand;
  const pending = useRef(0);
  const firstAdd = useRef(addLog);
  useEffect(() => {
    if (addLog !== firstAdd.current) pending.current += 1;
  }, [addLog]);

  useEffect(() => {
    const box = boxRef.current, cv = cvRef.current;
    if (!box || !cv) return;
    const g = cv.getContext('2d');
    if (!g) return;
    const fire = createFire(7);
    let W = 1, H = 1, raf = 0, alive = true;
    let last = performance.now() / 1000;
    const added: Added[] = [];
    let flying: Flying | null = null;
    let restIdx = 0;
    let boostAt = -10;
    const video = FIRE_VIDEO != null;

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
      const now = performance.now() / 1000;
      const dt = Math.min(0.05, now - last);
      last = now;
      const reduce = reduceRef.current;
      const u = Math.min((H * 0.36) / 180, W / 300);
      const fx = W / 2, fy = H * 0.64;

      // 장작 넣기: 한 번에 하나씩 (빠르게 여러 번 눌러도 겹치지 않음)
      if (!flying && pending.current > 0) {
        pending.current = 0;
        flying = { t0: now, rest: REST[restIdx % REST.length], seed: 100 + restIdx };
        restIdx++;
      }
      const sinceBoost = now - boostAt;
      // 닿은 뒤 0.4초에 걸쳐 커졌다가 약 4초 동안 원래대로
      const boost = sinceBoost < 0 ? 0 : sinceBoost < 0.4 ? sinceBoost / 0.4 : Math.max(0, 1 - (sinceBoost - 0.4) / 4);
      const power = 1 + 0.75 * boost;

      g.globalCompositeOperation = 'source-over';
      if (video) {
        g.clearRect(0, 0, W, H);
      } else {
        // 동굴 바닥·벽 (불빛이 닿는 곳만 은은하게)
        let gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, '#060707');
        gr.addColorStop(0.55, '#100c0a');
        gr.addColorStop(1, '#1a1410');
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
        const L = fire.level() * power;
        gr = g.createRadialGradient(fx, fy - 60 * u, 0, fx, fy - 60 * u, Math.max(W, H) * 0.75);
        gr.addColorStop(0, `rgba(150,80,40,${0.38 * L})`);
        gr.addColorStop(0.45, `rgba(70,35,18,${0.25 * L})`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);

        drawStones(g, fx, fy, u, L, false);
        drawEmberBed(g, fx, fy, u, now, power, reduce);
        // 뒤쪽 장작은 불꽃 뒤에, 앞쪽 장작은 불꽃 앞에(불꽃 뿌리를 가림)
        fire.drawLogs(g, BASE_LOGS.slice(0, 3), fx, fy, u, now, power, reduce);
      }

      // 넣은 장작: 천천히 숯이 됨, 가장 오래된 것부터 사그라듦
      for (let i = added.length - 1; i >= 0; i--) {
        const a = added[i];
        a.char = Math.min(0.9, (now - a.born) / 90);
        if (a.fadeFrom != null && now - a.fadeFrom > 3) added.splice(i, 1);
      }
      if (!video) {
        for (const a of added) {
          const alpha = a.fadeFrom != null ? Math.max(0, 1 - (now - a.fadeFrom) / 3) : 1;
          g.globalAlpha = alpha;
          fire.drawLogs(g, [a], fx, fy, u, now, power, reduce);
          g.globalAlpha = 1;
        }
        fire.draw(g, fx, fy - 10 * u, u * 1.05, now, dt, power, reduce);
        fire.drawLogs(g, BASE_LOGS.slice(3), fx, fy, u, now, power, reduce);
        drawStones(g, fx, fy, u, fire.level() * power, true);
      } else {
        fire.drawLogs(g, added, fx, fy, u, now, power, reduce);
      }

      // 날아 들어가는 장작
      if (flying) {
        const t = Math.min(1, ((now - flying.t0) * 1000) / (reduce ? FLY_MS * 0.6 : FLY_MS));
        const e = 1 - Math.pow(1 - t, 3);
        const sx = 230, sy = 260, sa = 0.9;
        const r = flying.rest;
        const x = sx + (r.x - sx) * e;
        const y = sy + (r.y - sy) * e - Math.sin(Math.PI * e) * 90; // 살짝 들어 올렸다 내려놓음
        const angle = sa + (r.angle - sa) * e;
        fire.drawLogs(g, [{ x, y, angle, len: 170, thick: 30, char: 0, seed: flying.seed }], fx, fy, u, now, 1, reduce);
        if (t >= 1) {
          added.push({ x: r.x, y: r.y, angle: r.angle, len: 170, thick: 30, char: 0, seed: flying.seed, born: now });
          const live = added.filter((a) => a.fadeFrom == null);
          if (live.length > 3) live[0].fadeFrom = now;
          flying = null;
          boostAt = now;
          fire.burst(fx, fy - 20 * u, u, reduce ? 15 : 55);
          landRef.current?.();
        }
      }
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now() / 1000;
        raf = requestAnimationFrame(frame);
      }
    };
    layout();
    raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(layout);
    ro.observe(box);
    document.addEventListener('visibilitychange', onVisibility);
    // 자동 점검용: 넣은 장작 수·날아가는 중인지
    const w = window as unknown as { __shimpyoCloseup?: () => unknown };
    w.__shimpyoCloseup = () => ({ added: added.filter((a) => a.fadeFrom == null).length, flying: flying != null, boosting: performance.now() / 1000 - boostAt < 4.4 });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      delete w.__shimpyoCloseup;
    };
  }, []);

  return (
    <div ref={boxRef} style={boxStyle} aria-hidden="true">
      {FIRE_VIDEO != null && <video src={Asset.fromModule(FIRE_VIDEO).uri} autoPlay loop muted playsInline style={videoStyle} />}
      <canvas ref={cvRef} style={canvasStyle} />
    </div>
  );
}

const boxStyle = { position: 'absolute', inset: 0, overflow: 'hidden', background: '#070606' } as const;
const canvasStyle = { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const;
const videoStyle = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } as const;
