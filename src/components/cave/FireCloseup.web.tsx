import { useEffect, useRef } from 'react';
import { Asset } from 'expo-asset';
import { CAVE_IMAGE, CHILD, FIRE, FIRE_VIDEO } from './caveConfig';
import { createFire, type Log } from './fireRenderer';
import { createFireClip } from './fireClip.web';

/**
 * 불 가까이 보기(불멍) — 웹
 * - 동굴 전체 화면과 같은 그림(cave-girl-nofire)에서 장작불 둘레만 잘라 크게 보여 줌 → 화풍이 같음.
 *   불꽃도 동굴 화면과 같은 fireRenderer로, 그림 속 장작 위 같은 자리에서 탐.
 * - 장작불을 가까이서 봄. 불꽃·불씨·불티는 계속 살아 움직이고(끝없이 반복, 같은 모양 되풀이 없음)
 *   주변 돌과 재가 불빛에 일렁임
 * - addLog 값이 바뀌면 장작 하나가 화면 아래에서 불 안으로 들어감 → 닿는 순간 onLand(소리), 불꽃이 잠깐 커지고 불티가 오름,
 *   몇 초에 걸쳐 원래 크기로. 넣은 장작은 천천히 숯이 되고, 많아지면 가장 오래된 것부터 사그라듦(최대 3개)
 * - 장작을 넣지 않아도 불은 계속 탐
 * - FIRE_VIDEO(실제 불꽃 영상)가 있으면 영상 위에 장작 넣기만 그림
 * - 화면이 보이지 않으면 그리기를 멈춤
 */
type Props = { reduceMotion: boolean; addLog: number; onLand?: () => void };

/** 그림 1px 기준으로 잘라 올 높이 (작을수록 크게 보임). 동굴 그림 높이 941px의 약 2/3 */
const CROP_H = 620;
// 넣은 장작이 놓이는 자리(불 바닥 기준, u 단위): 그림 속 장작더미 위
const REST = [
  { x: -30, y: -6, angle: -0.42 },
  { x: 34, y: -4, angle: 0.48 },
  { x: 2, y: -12, angle: -0.1 },
];
const LOG_LEN = 150, LOG_THICK = 24;
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
    const fire = createFire(3);
    const clip = createFireClip();
    let clipOn = false;
    let img: HTMLImageElement | null = null;
    const im = new Image();
    im.onload = () => {
      img = im;
    };
    im.src = Asset.fromModule(CAVE_IMAGE.source).uri;
    // 그림에서 잘라 올 범위: 높이 CROP_H(그림 px), 불이 가운데·아래쪽 2/3쯤
    const crop = () => {
      const ch = Math.min(CROP_H, CAVE_IMAGE.height);
      const cw = Math.min(CAVE_IMAGE.width, ch * (W / H));
      const fx = FIRE.x * CAVE_IMAGE.width, fy = FIRE.y * CAVE_IMAGE.height;
      const left = Math.max(0, Math.min(CAVE_IMAGE.width - cw, fx - cw / 2));
      const top = Math.max(0, Math.min(CAVE_IMAGE.height - ch, fy - ch * 0.64));
      const k = H / ch;
      return { left, top, cw, ch, k, toScreen: (u: number, v: number) => ({ x: (u * CAVE_IMAGE.width - left) * k, y: (v * CAVE_IMAGE.height - top) * k }) };
    };
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
      const cr = crop();
      const u = cr.k * FIRE.scale;
      const fp = cr.toScreen(FIRE.x, FIRE.y);
      const fx = fp.x, fy = fp.y;

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
        // 동굴 그림(같은 화풍)에서 불 둘레를 잘라 그림
        g.fillStyle = '#07090a';
        g.fillRect(0, 0, W, H);
        if (img) {
          g.imageSmoothingQuality = 'high';
          g.drawImage(img, cr.left, cr.top, cr.cw, cr.ch, 0, 0, W, H);
        }
        // 불빛: 바위·바닥·아이 쪽으로 일렁이며 비침 (동굴 화면과 같은 방식)
        const L = (clipOn ? clip.level() : fire.level()) * power;
        g.globalCompositeOperation = 'lighter';
        let gr = g.createRadialGradient(fx, fy - 60 * u, 0, fx, fy - 60 * u, 700 * u * (0.9 + 0.12 * L));
        gr.addColorStop(0, `rgba(255,150,70,${0.3 * L})`);
        gr.addColorStop(0.35, `rgba(200,95,40,${0.13 * L})`);
        gr.addColorStop(1, 'rgba(120,50,20,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
        const ch = cr.toScreen(CHILD.x + CHILD.w * 0.25, CHILD.y);
        gr = g.createRadialGradient(ch.x, ch.y, 0, ch.x, ch.y, CHILD.h * CAVE_IMAGE.height * cr.k * 0.75);
        gr.addColorStop(0, `rgba(255,150,80,${0.14 * L})`);
        gr.addColorStop(1, 'rgba(255,120,60,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'source-over';
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
        // 실사 불꽃(멀리서 보는 동굴 화면과 같은 영상·같은 색). 준비 전에는 코드 불꽃
        clipOn = clip.draw(g, fx, fy + 6 * cr.k, 150 * cr.k * 1.15, power);
        fire.draw(g, fx, fy, u * 1.3, now, dt, power, reduce, !clipOn);
      } else {
        fire.drawLogs(g, added, fx, fy, u, now, power, reduce);
      }

      // 날아 들어가는 장작
      if (flying) {
        const t = Math.min(1, ((now - flying.t0) * 1000) / (reduce ? FLY_MS * 0.6 : FLY_MS));
        const e = 1 - Math.pow(1 - t, 3);
        // 화면 오른쪽 아래 밖에서 들어옴
        const sx = (W - fx) / u + 60, sy = (H - fy) / u + 40, sa = 0.9;
        const r = flying.rest;
        const x = sx + (r.x - sx) * e;
        const y = sy + (r.y - sy) * e - Math.sin(Math.PI * e) * 90; // 살짝 들어 올렸다 내려놓음
        const angle = sa + (r.angle - sa) * e;
        fire.drawLogs(g, [{ x, y, angle, len: LOG_LEN, thick: LOG_THICK, char: 0, seed: flying.seed }], fx, fy, u, now, 1, reduce);
        if (t >= 1) {
          added.push({ x: r.x, y: r.y, angle: r.angle, len: LOG_LEN, thick: LOG_THICK, char: 0, seed: flying.seed, born: now });
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
      clip.dispose();
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
