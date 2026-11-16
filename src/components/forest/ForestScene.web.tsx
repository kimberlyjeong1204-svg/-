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
 */

type Props = { reduceMotion: boolean };

const VS = 'attribute vec2 p; varying vec2 v; void main(){ v = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); gl_Position = vec4(p,0.,1.); }';
const FS = `precision mediump float; varying vec2 v;
  uniform sampler2D bg, mask; uniform float t, amp; uniform vec4 view; uniform vec2 img;
  void main(){
    vec2 uv = view.zw + v * view.xy;
    float m = texture2D(mask, uv).r;
    float ph = sin(uv.y * 9.0 + uv.x * 4.0) * 2.2 + uv.x * 5.0;
    float gust = 0.65 + 0.35 * sin(t * 0.071 + 1.3);
    vec2 d = vec2(sin(t * 0.52 + ph) * 0.8 + sin(t * 0.21 + ph * 1.7) * 0.45,
                  sin(t * 0.39 + ph * 1.3) * 0.35);
    gl_FragColor = vec4(texture2D(bg, uv + d * m * amp * gust * 5.0 / img).rgb, 1.0);
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

export function ForestScene({ reduceMotion }: Props) {
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

    const drawFx = (now: number, dt: number) => {
      const reduce = reduceRef.current;
      fx.clearRect(0, 0, W, H);
      const s = pxScale();
      fx.globalCompositeOperation = 'lighter';
      for (const st of stars) {
        const tw = reduce ? 0.4 : 0.5 + 0.5 * Math.sin(now * st.w + st.p);
        const a = FOREST.starTwinkle * 0.32 * tw * tw;
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
        const a = (reduce ? 0.35 : f.level) * FOREST.fireflyBrightness;
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
      for (const n of ['t', 'amp', 'view', 'img']) uni[n] = gl.getUniformLocation(prog, n);
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
