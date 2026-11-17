import { useEffect, useRef } from 'react';
import { Asset } from 'expo-asset';
import { FOREST, FOREST_IMAGE, coverView, forest, forestImages } from './forestConfig';

/**
 * 숲속 휴식 공간 (웹앱)
 * 검토 도구와 같은 방식으로 그립니다.
 * - 배경: WebGL. 바람 마스크가 밝은 곳(앞쪽 잎)만 아주 천천히 일렁임. 사람·하늘·나무 둥치는 움직이지 않음
 * - 별: 원본 별 위에 옅은 빛을 서로 다른 주기로 더함
 * - 반딧불이: 원본 반딧불이 자리에서 출발해 느리게 떠다니며 불규칙하게 깜빡임
 * - 「동작 줄이기」이면 정지, 화면이 보이지 않으면 그리기를 멈춤
 * - 비(Rain Mode): 8초에 걸쳐 바뀜. 깊이가 다른 빗줄기, 잎·바닥에 튀는 빗방울, 젖은 느낌(조금 어둡고
 *   채도 낮게, 잎에 은은한 반짝임), 옅은 안개, 반딧불이·별은 줄어듦. 원본 그림은 그대로 두고 위에 효과만 그림.
 *   동작 줄이기이면 빗줄기 없이 젖은 느낌과 안개만.
 */

type Props = { reduceMotion: boolean; rain?: boolean };

const VS = 'attribute vec2 p; varying vec2 v; void main(){ v = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); gl_Position = vec4(p,0.,1.); }';
const FS = `precision mediump float; varying vec2 v;
  uniform sampler2D bg, mask; uniform float t, amp, wet; uniform vec4 view; uniform vec2 img;
  void main(){
    vec2 uv = view.zw + v * view.xy;
    float m = texture2D(mask, uv).r;
    float ph = sin(uv.y * 9.0 + uv.x * 4.0) * 2.2 + uv.x * 5.0;
    float gust = 0.65 + 0.35 * sin(t * 0.071 + 1.3);
    vec2 d = vec2(sin(t * 0.52 + ph) * 0.8 + sin(t * 0.21 + ph * 1.7) * 0.45,
                  sin(t * 0.39 + ph * 1.3) * 0.35);
    vec3 col = texture2D(bg, uv + d * m * amp * gust * 5.0 / img).rgb;
    // 비에 젖은 숲: 채도를 조금 낮추고, 조금 어둡고 차갑게. 앞쪽 잎에는 드문드문 은은한 반짝임
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 wetCol = mix(col, vec3(lum), 0.28) * 0.84 + vec3(-0.01, 0.006, 0.02);
    float sheen = m * pow(max(0.0, sin(t * 1.7 + uv.x * 90.0 + uv.y * 60.0) * sin(t * 1.1 - uv.y * 75.0)), 12.0);
    col = mix(col, wetCol + vec3(0.07, 0.09, 0.1) * sheen, wet);
    gl_FragColor = vec4(col, 1.0);
  }`;

const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Fly = {
  u: number; v: number; r1: number; r2: number; a1: number; a2: number; p1: number; p2: number; p3: number;
  size: number; soft: number; level: number; target: number; next: number;
};

function makeFlies(n: number): Fly[] {
  const pool = forest.flies.filter((s) => s[1] > 0.33).sort(() => Math.random() - 0.5);
  const out: Fly[] = [];
  for (let i = 0; i < n; i++) {
    const s = pool[i % Math.max(1, pool.length)] ?? [rand(0.1, 0.9), rand(0.45, 0.8), 8];
    const near = s[1] > 0.72; // 아래쪽(앞쪽)은 조금 크고 흐리게
    out.push({
      u: s[0] + rand(-0.03, 0.03), v: s[1] + rand(-0.015, 0.015),
      r1: rand(14, 34), r2: rand(6, 16), a1: rand(0.035, 0.07), a2: rand(0.08, 0.14),
      p1: rand(0, 6.3), p2: rand(0, 6.3), p3: rand(0, 6.3),
      size: near ? rand(5, 8) : rand(2.6, 4.2), soft: near ? 1.6 : 1,
      level: rand(0.05, 0.25), target: 0.1, next: performance.now() / 1000 + rand(0.5, 4),
    });
  }
  return out;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => no(new Error(src));
    i.src = src;
  });
}

type Drop = { x: number; y: number; z: number; land: number; len: number };
type Splash = { x: number; y: number; age: number; size: number; leaf: boolean };

export function ForestScene({ reduceMotion, rain = false }: Props) {
  const rainRef = useRef(rain);
  rainRef.current = rain;
  const glRef = useRef<HTMLCanvasElement | null>(null);
  const fxRef = useRef<HTMLCanvasElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;

  useEffect(() => {
    const glCanvas = glRef.current;
    const fxCanvas = fxRef.current;
    const box = boxRef.current;
    if (!glCanvas || !fxCanvas || !box) return;
    const gl = glCanvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
    const fx = fxCanvas.getContext('2d');
    if (!gl || !fx) return;

    let W = 0, H = 0, view = coverView(1, 1), raf = 0, alive = true;
    // 비의 양(0~1). 켜고 끌 때 8초에 걸쳐 바뀜
    let wetAmt = rainRef.current ? 1 : 0;
    const drops: Drop[] = [];
    const splashes: Splash[] = [];
    const DROP_COUNT = 150;
    const newDrop = (top: boolean): Drop => {
      const z = Math.random() ** 1.6 * 0.75 + 0.25; // 멀리 있는 빗줄기가 더 많음
      // 가까운 빗방울은 바닥(아래쪽)에, 먼 빗방울은 잎(가운데)에 닿음
      const land = z > 0.7 ? rand(0.74, 0.99) : rand(0.38, 0.8);
      return { x: Math.random(), y: top ? rand(-0.25, 0) : rand(-0.2, land), z, land, len: 0.018 + 0.05 * z };
    };
    let last = performance.now() / 1000;
    const t0 = last;
    let frozenT = 0;
    const flies = makeFlies(FOREST.fireflies);
    const stars = forest.stars.map((s) => ({ u: s[0], v: s[1], w: rand(0.6, 1.6), p: rand(0, 6.3) }));
    const uni: Record<string, WebGLUniformLocation | null> = {};

    const layout = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(r.width * dpr));
      H = Math.max(1, Math.round(r.height * dpr));
      glCanvas.width = fxCanvas.width = W;
      glCanvas.height = fxCanvas.height = H;
      view = coverView(W, H);
      gl.viewport(0, 0, W, H);
    };
    const toScreen = (u: number, v: number): [number, number] => [((u - view.ox) / view.sx) * W, ((v - view.oy) / view.sy) * H];
    const pxScale = () => W / (view.sx * FOREST_IMAGE.width);

    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const texture = (img: HTMLImageElement, unit: number) => {
      const tx = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    };

    const updateFly = (f: Fly, now: number, dt: number) => {
      if (now > f.next) {
        f.target = f.target > 0.3 ? rand(0.04, 0.14) : rand(0.45, 1);
        f.next = now + (f.target > 0.3 ? rand(0.8, 2.0) : rand(1.8, 6.5));
      }
      const k = f.target > f.level ? 1.4 : 0.55; // 켜질 땐 조금 빠르게, 꺼질 땐 천천히
      f.level += (f.target - f.level) * Math.min(1, dt * k);
    };

    const drawRain = (dt: number, reduce: boolean) => {
      const r = wetAmt;
      if (r < 0.01) return;
      // 옅은 안개: 아래쪽이 조금 더 짙게
      const mist = fx.createLinearGradient(0, H * 0.35, 0, H);
      mist.addColorStop(0, 'rgba(150,180,188,0)');
      mist.addColorStop(1, `rgba(150,180,188,${0.16 * r})`);
      fx.fillStyle = mist;
      fx.fillRect(0, H * 0.35, W, H * 0.65);
      if (reduce) return;
      while (drops.length < DROP_COUNT) drops.push(newDrop(false));
      const n = Math.round(DROP_COUNT * r);
      const slant = 0.06; // 아주 약한 바람
      fx.lineCap = 'round';
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        d.y += dt * (0.55 + 1.05 * d.z);
        d.x += dt * slant * d.z;
        if (d.y >= d.land) {
          if (i < n && Math.random() < 0.55) splashes.push({ x: d.x, y: d.land, age: 0, size: 0.4 + d.z, leaf: d.z <= 0.7 });
          drops[i] = newDrop(true);
          continue;
        }
        if (i >= n) continue;
        const x = d.x * W, y = d.y * H, len = d.len * H;
        fx.strokeStyle = `rgba(205,222,226,${(0.05 + 0.2 * d.z) * r})`;
        fx.lineWidth = Math.max(1, (0.6 + 1.1 * d.z) * (W / 800));
        fx.beginPath();
        fx.moveTo(x - slant * len, y - len);
        fx.lineTo(x, y);
        fx.stroke();
      }
      // 튀는 빗방울: 바닥은 작은 물결, 잎은 반짝이는 점
      for (let i = splashes.length - 1; i >= 0; i--) {
        const sp = splashes[i];
        sp.age += dt;
        const life = sp.leaf ? 0.18 : 0.32;
        if (sp.age > life) {
          splashes.splice(i, 1);
          continue;
        }
        const p = sp.age / life;
        const a = (1 - p) * r;
        const x = sp.x * W, y = sp.y * H;
        if (sp.leaf) {
          fx.fillStyle = `rgba(220,236,236,${0.35 * a})`;
          fx.fillRect(x - 1, y - 1, 2, 2);
        } else {
          const rad = (2 + 7 * p) * sp.size * (W / 800);
          fx.strokeStyle = `rgba(200,220,224,${0.35 * a})`;
          fx.lineWidth = 1;
          fx.beginPath();
          fx.ellipse(x, y, rad, rad * 0.32, 0, 0, Math.PI * 2);
          fx.stroke();
        }
      }
      if (splashes.length > 220) splashes.splice(0, splashes.length - 220);
    };

    const drawFx = (now: number, dt: number) => {
      const reduce = reduceRef.current;
      fx.clearRect(0, 0, W, H);
      const s = pxScale();
      drawRain(dt, reduce);
      // 비가 오면 별·반딧불이는 줄어듦
      const dim = 1 - 0.75 * wetAmt;
      fx.globalCompositeOperation = 'lighter';
      for (const st of stars) {
        const tw = reduce ? 0.4 : 0.5 + 0.5 * Math.sin(now * st.w + st.p);
        const a = FOREST.starTwinkle * 0.32 * tw * tw * dim;
        if (a < 0.01) continue;
        const [x, y] = toScreen(st.u, st.v);
        const r = 3.2 * s;
        const g = fx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(250,246,232,${a})`);
        g.addColorStop(1, 'rgba(250,246,232,0)');
        fx.fillStyle = g;
        fx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (const f of flies) {
        if (!reduce) updateFly(f, now, dt);
        const tt = reduce ? 0 : now;
        const u = f.u + (Math.sin(tt * f.a1 + f.p1) * f.r1 + Math.sin(tt * f.a2 + f.p2) * f.r2) / FOREST_IMAGE.width;
        const v = f.v + (Math.sin(tt * f.a1 * 0.8 + f.p3) * f.r1 * 0.7 + Math.cos(tt * f.a2 * 1.1 + f.p1) * f.r2) / FOREST_IMAGE.height;
        const [x, y] = toScreen(u, v);
        const a = (reduce ? 0.35 : f.level) * FOREST.fireflyBrightness * dim;
        if (a < 0.01) continue;
        const core = f.size * s;
        const glow = core * 4.2 * f.soft;
        let g = fx.createRadialGradient(x, y, 0, x, y, glow);
        g.addColorStop(0, `rgba(246,226,140,${0.55 * a})`);
        g.addColorStop(0.35, `rgba(220,214,120,${0.18 * a})`);
        g.addColorStop(1, 'rgba(200,210,110,0)');
        fx.fillStyle = g;
        fx.fillRect(x - glow, y - glow, glow * 2, glow * 2);
        g = fx.createRadialGradient(x, y, 0, x, y, core);
        g.addColorStop(0, `rgba(255,248,205,${0.9 * a})`);
        g.addColorStop(1, 'rgba(255,240,170,0)');
        fx.fillStyle = g;
        fx.fillRect(x - core, y - core, core * 2, core * 2);
      }
      fx.globalCompositeOperation = 'source-over';
    };

    const frame = () => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const now = performance.now() / 1000;
      const dt = Math.min(0.1, now - last);
      last = now;
      const reduce = reduceRef.current;
      const t = reduce ? frozenT : now - t0;
      if (!reduce) frozenT = t;
      gl.uniform1f(uni.t, t);
      gl.uniform1f(uni.amp, reduce ? 0 : FOREST.leafSway);
      wetAmt += ((rainRef.current ? 1 : 0) - wetAmt) * Math.min(1, dt / 2.6); // 약 8초에 걸쳐 바뀜
      if (Math.abs((rainRef.current ? 1 : 0) - wetAmt) < 0.002) wetAmt = rainRef.current ? 1 : 0;
      gl.uniform1f(uni.wet, wetAmt);
      gl.uniform4f(uni.view, view.sx, view.sy, view.ox, view.oy);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      drawFx(now, dt);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now() / 1000;
        raf = requestAnimationFrame(frame);
      }
    };

    (async () => {
      const [bg, mask] = await Promise.all([
        loadImage(Asset.fromModule(forestImages.background).uri),
        loadImage(Asset.fromModule(forestImages.windMask).uri),
      ]);
      if (!alive) return;
      const prog = gl.createProgram()!;
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      texture(bg, 0);
      texture(mask, 1);
      for (const n of ['t', 'amp', 'wet', 'view', 'img']) uni[n] = gl.getUniformLocation(prog, n);
      gl.uniform1i(gl.getUniformLocation(prog, 'bg'), 0);
      gl.uniform1i(gl.getUniformLocation(prog, 'mask'), 1);
      gl.uniform2f(uni.img, FOREST_IMAGE.width, FOREST_IMAGE.height);
      layout();
      raf = requestAnimationFrame(frame);
    })().catch(() => {
      // 이미지를 못 불러오면 짙은 숲색 바탕만 보입니다.
    });

    const ro = new ResizeObserver(layout);
    ro.observe(box);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return (
    // 웹 전용 파일이라 DOM 요소를 직접 씁니다. 숲 그림은 장식이라 화면 읽기에서 건너뜁니다.
    <div ref={boxRef} style={boxStyle} aria-hidden="true">
      <canvas ref={glRef} style={canvasStyle} />
      <canvas ref={fxRef} style={canvasStyle} />
    </div>
  );
}

const canvasStyle = { position: 'absolute' as const, inset: 0, width: '100%', height: '100%', display: 'block' };

const boxStyle = { position: 'absolute' as const, inset: 0, overflow: 'hidden', backgroundColor: '#0B1A1E', pointerEvents: 'none' as const };
