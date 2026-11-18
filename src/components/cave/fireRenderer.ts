/**
 * 살아 있는 장작불 그리기 (웹 canvas 2D) — 동굴 전체 화면과 「불 가까이 보기」가 함께 씀
 *
 * - 불꽃 혀: 여러 갈래의 불꽃이 각자 다른 속도로 키·폭·기울기가 바뀌고, 옆선은 위로 흐르는 물결이라 타오르는 느낌
 *   (바깥 붉은 주황 → 안쪽 노랑 → 바닥 흰빛, 더해지는 빛 합성)
 * - 가끔 불꽃 끝이 떨어져 나가 위로 사라짐, 불티는 따로 날아오름
 * - 장작의 붉은 불씨: 갈라진 틈을 따라 천천히 숨 쉬듯 밝아졌다 어두워짐
 * - 흔들림은 매끄러운 잡음(값 잡음)으로 만들어, 반복 주기가 드러나지 않고 오래 봐도 같은 모양이 되풀이되지 않음
 * - power: 1이 기본. 장작을 넣거나 종이를 태우면 잠깐 커짐
 * 실제 불꽃 영상을 받으면 caveConfig의 FIRE_VIDEO로 바꿔 끼울 수 있음(가까이 보기).
 */

export type Log = {
  /** 불 중심 기준 위치·각도·길이·굵기 (단위: u) */
  x: number;
  y: number;
  angle: number;
  len: number;
  thick: number;
  /** 0(새 장작)~1(다 탄 숯) */
  char: number;
  seed: number;
};

/** 매끄러운 1차원 잡음 (0~1) */
function makeNoise(seed: number) {
  const table = new Float32Array(256);
  let s = seed * 9301 + 49297;
  for (let i = 0; i < 256; i++) {
    s = (s * 9301 + 49297) % 233280;
    table[i] = s / 233280;
  }
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = table[i & 255], b = table[(i + 1) & 255];
    const t = f * f * (3 - 2 * f);
    return a + (b - a) * t;
  };
}

type Tongue = { off: number; w: number; h: number; speed: number; noise: (x: number) => number; phase: number };
type Lick = { x: number; y: number; vy: number; r: number; age: number; life: number };
type Spark = { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number };

export function createFire(seed = 1) {
  const tongues: Tongue[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1) - 0.5;
    tongues.push({
      off: k * 1.0,
      w: 0.36 - Math.abs(k) * 0.22,
      h: 1.0 - Math.abs(k) * 1.1,
      speed: 0.7 + ((i * 37) % 10) / 14,
      noise: makeNoise(seed * 31 + i * 7),
      phase: i * 1.7,
    });
  }
  const glowNoise = makeNoise(seed * 13 + 5);
  const licks: Lick[] = [];
  const sparks: Spark[] = [];
  let lickTimer = 0;
  let sparkCarry = 0;
  let flick = 1;

  /** 지금 불빛 세기(주변을 비출 때 씀, 0.7~1.5쯤) */
  const level = () => flick;

  /**
   * (fx, fy): 불꽃 바닥 가운데, u: 크기 단위(px). 불꽃 기본 폭 약 100u, 높이 약 180u
   */
  /** withTongues=false: 실사 불꽃 영상을 쓸 때 — 코드 불꽃은 그리지 않고 바닥 불빛·불티만 */
  function draw(g: CanvasRenderingContext2D, fx: number, fy: number, u: number, t: number, dt: number, power = 1, reduce = false, withTongues = true) {
    const sp = reduce ? 0.35 : 1;
    const tt = t * sp;
    flick += (0.88 + 0.22 * glowNoise(tt * 2.1) + 0.06 * glowNoise(tt * 7.3 + 40) - flick) * Math.min(1, dt * 6);
    const P = power * flick;

    g.save();
    g.globalCompositeOperation = 'lighter';

    // 바닥 불빛
    let gr = g.createRadialGradient(fx, fy - 30 * u, 0, fx, fy - 30 * u, 150 * u * (0.85 + 0.2 * P));
    gr.addColorStop(0, `rgba(255,170,80,${0.32 * P})`);
    gr.addColorStop(0.5, `rgba(230,100,40,${0.12 * P})`);
    gr.addColorStop(1, 'rgba(200,60,20,0)');
    g.fillStyle = gr;
    g.fillRect(fx - 160 * u, fy - 200 * u, 320 * u, 280 * u);

    // 불꽃 혀: 바깥(붉은 주황) → 안쪽(노랑) 두 겹
    for (const layer of withTongues ? [0, 1] : []) {
      for (const tg of tongues) {
        const nh = tg.noise(tt * tg.speed * 1.3 + tg.phase);
        const nw = tg.noise(tt * tg.speed * 0.9 + 50 + tg.phase);
        const sway = (tg.noise(tt * tg.speed * 0.6 + 100) - 0.5) * 2;
        const hBase = Math.max(0.12, tg.h) * (0.55 + 0.75 * nh) * (0.75 + 0.35 * P);
        const H = 180 * u * hBase * (layer ? 0.62 : 1);
        const W = 100 * u * tg.w * (0.75 + 0.5 * nw) * (layer ? 0.55 : 1) * (0.9 + 0.15 * P);
        const bx = fx + tg.off * 70 * u * (layer ? 0.8 : 1);
        const by = fy + (Math.abs(tg.off) * 18 + (tg.noise(tg.phase * 3) - 0.5) * 10) * u;
        const tipX = bx + sway * W * 0.9;
        const tipY = by - H;
        const steps = 10;
        g.beginPath();
        // 왼쪽 옆선(아래→위), 위로 흐르는 물결
        for (let i = 0; i <= steps; i++) {
          const q = i / steps;
          const wid = W * Math.sin(Math.PI * Math.min(1, (1 - q) * 0.9 + 0.1)) * (1 - q * 0.85);
          const wave = Math.sin(q * 7 - tt * tg.speed * 7 + tg.phase) * W * 0.18 * q;
          const cx = bx + (tipX - bx) * q * q + wave;
          const y = by - H * q;
          if (i === 0) g.moveTo(cx - wid * 0.5, y);
          else g.lineTo(cx - wid * 0.5, y);
        }
        for (let i = steps; i >= 0; i--) {
          const q = i / steps;
          const wid = W * Math.sin(Math.PI * Math.min(1, (1 - q) * 0.9 + 0.1)) * (1 - q * 0.85);
          const wave = Math.sin(q * 7 - tt * tg.speed * 7 + tg.phase + 0.8) * W * 0.18 * q;
          const cx = bx + (tipX - bx) * q * q + wave;
          g.lineTo(cx + wid * 0.5, by - H * q);
        }
        g.closePath();
        gr = g.createLinearGradient(0, by, 0, tipY);
        if (layer === 0) {
          gr.addColorStop(0, `rgba(255,190,90,${0.5 * Math.min(1.3, P)})`);
          gr.addColorStop(0.35, 'rgba(255,120,40,0.42)');
          gr.addColorStop(0.75, 'rgba(210,60,20,0.22)');
          gr.addColorStop(1, 'rgba(160,30,10,0)');
        } else {
          gr.addColorStop(0, 'rgba(255,250,220,0.75)');
          gr.addColorStop(0.3, 'rgba(255,215,120,0.5)');
          gr.addColorStop(0.8, 'rgba(255,150,50,0.12)');
          gr.addColorStop(1, 'rgba(255,120,40,0)');
        }
        g.fillStyle = gr;
        g.fill();
        // 불꽃 끝이 가끔 떨어져 나감
        if (layer === 0 && !reduce && nh > 0.82 && Math.random() < dt * 2.5) {
          licks.push({ x: tipX, y: tipY + H * 0.1, vy: -(60 + Math.random() * 50) * u, r: W * 0.35, age: 0, life: 0.35 + Math.random() * 0.25 });
        }
      }
    }

    // 불꽃 뿌리를 감싸는 밝은 숯불 빛
    gr = g.createRadialGradient(fx, fy + 4 * u, 0, fx, fy + 4 * u, 70 * u);
    gr.addColorStop(0, `rgba(255,200,110,${0.45 * Math.min(1.3, P)})`);
    gr.addColorStop(0.5, `rgba(255,120,40,${0.2 * P})`);
    gr.addColorStop(1, 'rgba(220,70,20,0)');
    g.fillStyle = gr;
    g.save();
    g.translate(fx, fy + 4 * u);
    g.scale(1, 0.45);
    g.translate(-fx, -(fy + 4 * u));
    g.fillRect(fx - 70 * u, fy + 4 * u - 70 * u, 140 * u, 140 * u);
    g.restore();

    // 떨어져 나간 불꽃 조각
    lickTimer += dt;
    for (let i = licks.length - 1; i >= 0; i--) {
      const l = licks[i];
      l.age += dt;
      if (l.age > l.life) {
        licks.splice(i, 1);
        continue;
      }
      l.y += l.vy * dt;
      const a = 1 - l.age / l.life;
      const r = l.r * (0.6 + 0.4 * a);
      gr = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
      gr.addColorStop(0, `rgba(255,170,70,${0.45 * a})`);
      gr.addColorStop(1, 'rgba(220,80,20,0)');
      g.fillStyle = gr;
      g.fillRect(l.x - r, l.y - r, r * 2, r * 2);
    }
    if (licks.length > 30) licks.splice(0, licks.length - 30);

    // 불티
    sparkCarry += dt * (reduce ? 1.2 : 5) * (0.6 + 0.6 * P);
    while (sparkCarry > 1) {
      sparkCarry -= 1;
      addSpark(fx, fy, u, 1);
    }
    drawSparks(g, u, dt, tt);
    g.restore();
  }

  function addSpark(fx: number, fy: number, u: number, strength: number) {
    sparks.push({
      x: fx + (Math.random() - 0.5) * 70 * u,
      y: fy - 30 * u - Math.random() * 50 * u,
      vx: (Math.random() - 0.5) * 50 * u * strength,
      vy: -(70 + Math.random() * 120) * u * strength,
      age: 0,
      life: 1.2 + Math.random() * 1.6,
      size: (0.8 + Math.random() * 1.4) * Math.max(0.6, u),
    });
    if (sparks.length > 220) sparks.splice(0, sparks.length - 220);
  }

  function drawSparks(g: CanvasRenderingContext2D, u: number, dt: number, tt: number) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.age += dt;
      if (p.age > p.life) {
        sparks.splice(i, 1);
        continue;
      }
      const t = p.age / p.life;
      p.x += (p.vx + Math.sin(tt * 2 + p.y * 0.05) * 14 * u) * dt;
      p.y += p.vy * dt;
      p.vy *= 0.995;
      p.vx *= 0.98;
      const a = (1 - t) * (0.6 + 0.4 * Math.sin(p.age * 30 + i));
      g.fillStyle = `rgba(255,${200 - 90 * t},${110 - 70 * t},${a})`;
      g.fillRect(p.x, p.y, p.size, p.size);
    }
  }

  /** 장작을 넣었을 때: 불티가 한꺼번에 오름 */
  function burst(fx: number, fy: number, u: number, count = 50) {
    for (let i = 0; i < count; i++) addSpark(fx, fy, u, 1.4);
  }

  /** 장작 그리기(가까이 보기): 나무껍질·검게 탄 부분·갈라진 틈의 붉은 불씨(숨 쉬듯) */
  function drawLogs(g: CanvasRenderingContext2D, logs: Log[], fx: number, fy: number, u: number, t: number, power = 1, reduce = false) {
    const tt = t * (reduce ? 0.35 : 1);
    for (const lg of logs) {
      const n = makeNoiseCached(lg.seed);
      g.save();
      g.translate(fx + lg.x * u, fy + lg.y * u);
      g.rotate(lg.angle);
      const L = lg.len * u, T = lg.thick * u;
      // 몸통: 나무 → 숯
      const wood = lerpColor([92, 62, 38], [26, 20, 17], Math.min(1, lg.char * 1.2));
      const dark = lerpColor([50, 32, 20], [12, 10, 9], lg.char);
      let gr = g.createLinearGradient(0, -T / 2, 0, T / 2);
      gr.addColorStop(0, `rgb(${wood.join(',')})`);
      gr.addColorStop(1, `rgb(${dark.join(',')})`);
      g.fillStyle = gr;
      g.beginPath();
      g.roundRect(-L / 2, -T / 2, L, T, T * 0.45);
      g.fill();
      // 나무결
      g.strokeStyle = `rgba(20,12,8,${0.5 - lg.char * 0.3})`;
      g.lineWidth = Math.max(1, T * 0.04);
      for (let k = 0; k < 5; k++) {
        const yy = (-0.32 + k * 0.16) * T;
        g.beginPath();
        g.moveTo(-L * 0.45, yy);
        g.bezierCurveTo(-L * 0.1, yy + T * 0.06 * Math.sin(lg.seed + k), L * 0.1, yy - T * 0.05, L * 0.45, yy);
        g.stroke();
      }
      // 불 쪽(가운데)으로 갈수록 검게 탐
      gr = g.createRadialGradient(0, 0, 0, 0, 0, L * 0.45);
      gr.addColorStop(0, `rgba(8,6,5,${0.75})`);
      gr.addColorStop(1, 'rgba(8,6,5,0)');
      g.fillStyle = gr;
      g.fillRect(-L / 2, -T / 2, L, T);
      // 갈라진 틈의 불씨
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 7; k++) {
        const cx = (-0.28 + k * 0.09 + (n(k * 3.1) - 0.5) * 0.05) * L;
        const pulse = 0.35 + 0.65 * n(tt * (0.3 + k * 0.07) + k * 11);
        const a = (0.25 + 0.55 * (1 - Math.abs(cx / (L * 0.5)))) * pulse * Math.min(1.4, power) * (0.5 + lg.char);
        const rr = T * (0.18 + 0.2 * n(k * 7.7));
        gr = g.createRadialGradient(cx, T * 0.15, 0, cx, T * 0.15, rr * 2.2);
        gr.addColorStop(0, `rgba(255,150,60,${a})`);
        gr.addColorStop(0.4, `rgba(220,60,20,${a * 0.6})`);
        gr.addColorStop(1, 'rgba(160,30,10,0)');
        g.fillStyle = gr;
        g.fillRect(cx - rr * 2.2, T * 0.15 - rr * 2.2, rr * 4.4, rr * 4.4);
        // 가는 틈 선
        g.strokeStyle = `rgba(255,${110 + 60 * pulse},50,${a * 0.9})`;
        g.lineWidth = Math.max(1, T * 0.05);
        g.beginPath();
        g.moveTo(cx - rr, T * (0.05 + 0.1 * n(k)));
        g.lineTo(cx + rr * 0.3, T * 0.2);
        g.lineTo(cx + rr, T * (0.1 + 0.15 * n(k + 4)));
        g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
      g.restore();
    }
  }

  return { draw, drawLogs, burst, level };
}

const noiseCache = new Map<number, (x: number) => number>();
function makeNoiseCached(seed: number) {
  let n = noiseCache.get(seed);
  if (!n) {
    n = makeNoise(seed);
    noiseCache.set(seed, n);
  }
  return n;
}

function lerpColor(a: number[], b: number[], t: number) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

/** 숯불 바닥(재와 불씨) — 가까이 보기 */
export function drawEmberBed(g: CanvasRenderingContext2D, fx: number, fy: number, u: number, t: number, power = 1, reduce = false) {
  const n = makeNoiseCached(777);
  const tt = t * (reduce ? 0.35 : 1);
  // 재
  let gr = g.createRadialGradient(fx, fy + 10 * u, 0, fx, fy + 10 * u, 150 * u);
  gr.addColorStop(0, 'rgba(70,62,58,0.95)');
  gr.addColorStop(0.7, 'rgba(40,36,34,0.8)');
  gr.addColorStop(1, 'rgba(20,18,17,0)');
  g.fillStyle = gr;
  g.beginPath();
  g.ellipse(fx, fy + 12 * u, 150 * u, 46 * u, 0, 0, Math.PI * 2);
  g.fill();
  // 숯 조각과 불씨
  g.save();
  for (let i = 0; i < 46; i++) {
    const a = n(i * 1.3) * Math.PI * 2;
    const r = Math.sqrt(n(i * 2.7 + 9)) * 110 * u;
    const x = fx + Math.cos(a) * r, y = fy + 14 * u + Math.sin(a) * r * 0.3;
    const s = (3 + n(i * 5.1) * 7) * u;
    g.fillStyle = `rgba(${18 + n(i) * 20},${16 + n(i) * 14},${14},0.95)`;
    g.beginPath();
    g.ellipse(x, y, s, s * 0.6, n(i * 3) * 3, 0, Math.PI * 2);
    g.fill();
    if (r < 80 * u) {
      const pulse = 0.3 + 0.7 * n(tt * (0.25 + n(i) * 0.4) + i * 5);
      g.globalCompositeOperation = 'lighter';
      gr = g.createRadialGradient(x, y, 0, x, y, s * 1.6);
      gr.addColorStop(0, `rgba(255,120,40,${0.55 * pulse * Math.min(1.3, power) * (1 - r / (90 * u))})`);
      gr.addColorStop(1, 'rgba(200,40,10,0)');
      g.fillStyle = gr;
      g.fillRect(x - s * 1.6, y - s * 1.6, s * 3.2, s * 3.2);
      g.globalCompositeOperation = 'source-over';
    }
  }
  g.restore();
}

/** 불을 둘러싼 돌(가까이 보기): 불 쪽 면이 따뜻하게 비침 */
export function drawStones(g: CanvasRenderingContext2D, fx: number, fy: number, u: number, light: number, front: boolean) {
  const n = makeNoiseCached(4242);
  const N = 13;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + 0.2;
    const isFront = Math.sin(a) > 0;
    if (isFront !== front) continue;
    const x = fx + Math.cos(a) * 168 * u, y = fy + 14 * u + Math.sin(a) * 54 * u;
    const rw = (30 + n(i) * 16) * u * (isFront ? 1.25 : 0.85), rh = rw * (0.62 + n(i + 3) * 0.15);
    let gr = g.createRadialGradient(x - rw * 0.15, y - rh * 0.5, rw * 0.1, x, y, rw * 1.15);
    gr.addColorStop(0, isFront ? 'rgb(64,58,52)' : 'rgb(52,47,43)');
    gr.addColorStop(0.6, isFront ? 'rgb(36,33,30)' : 'rgb(30,28,26)');
    gr.addColorStop(1, 'rgb(12,11,10)');
    g.fillStyle = gr;
    // 울퉁불퉁한 돌 모양
    const rot = (n(i * 2) - 0.5) * 0.6;
    g.beginPath();
    const V = 11;
    for (let k = 0; k <= V; k++) {
      const th = (k / V) * Math.PI * 2;
      const j = 0.82 + 0.3 * n(i * 13 + k * 1.7);
      const px = Math.cos(th) * rw * j, py = Math.sin(th) * rh * j * (Math.sin(th) < 0 ? 1.1 : 0.85);
      const qx = x + px * Math.cos(rot) - py * Math.sin(rot), qy = y + px * Math.sin(rot) + py * Math.cos(rot);
      if (k === 0) g.moveTo(qx, qy);
      else g.lineTo(qx, qy);
    }
    g.closePath();
    g.fill();
    // 이끼·얼룩
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.beginPath();
    g.ellipse(x + rw * (n(i * 5) - 0.5) * 0.8, y + rh * 0.2, rw * 0.3, rh * 0.18, rot, 0, Math.PI * 2);
    g.fill();
    // 불 쪽에서 비치는 빛
    const lx = x + (fx - x) * 0.25, ly = y + (fy - y) * 0.25 - rh * 0.2;
    g.globalCompositeOperation = 'lighter';
    gr = g.createRadialGradient(lx, ly, 0, lx, ly, rw);
    gr.addColorStop(0, `rgba(255,140,60,${(isFront ? 0.2 : 0.36) * light})`);
    gr.addColorStop(1, 'rgba(255,100,40,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = 'source-over';
  }
}
