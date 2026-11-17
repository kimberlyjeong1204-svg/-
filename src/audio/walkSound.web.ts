import { getContext, setAmbientSession } from './webAudio';

/**
 * 숲 거닐기 장소 소리 (웹) — 녹음 파일 없이 Web Audio로 만든 **임시 소리**. 숲 기본 자연음(귀뚜라미·바람)은 숲 공간이 그대로 맡고,
 * 여기서는 장소에 따라 달라지는 소리만 섞습니다. 최종 녹음을 받으면 각 층의 소스만 바꾸면 됩니다.
 * - water: 폭포·물소리 (멀리서는 낮고 작게, 가까울수록 크고 풍부하게)
 * - leaves: 나뭇잎 스치는 소리
 * - birdsNear / birdsFar: 가까운 새소리 / 멀리서 들리는 새소리 (가끔, 불규칙하게)
 * - 발소리: 걷는 동안만 낙엽(또는 눈) 밟는 소리, 멈추면 바로 잦아듦
 */
export type WalkMix = { water: number; leaves: number; birdsNear: number; birdsFar: number };
export type Ground = 'leaves' | 'snow';

let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let layers: { water: { g: GainNode; tone: BiquadFilterNode }; leaves: { g: GainNode } } | null = null;
let mix: WalkMix = { water: 0, leaves: 0, birdsNear: 0, birdsFar: 0 };
let birdTimer: ReturnType<typeof setTimeout> | null = null;
let stepTimer: ReturnType<typeof setInterval> | null = null;
let ground: Ground = 'leaves';
let stopTimer: ReturnType<typeof setTimeout> | null = null;

function ctxReady() {
  const c = getContext();
  return c && c.state === 'running' ? c : null;
}

function ensure(c: AudioContext) {
  if (master) return;
  setAmbientSession();
  master = c.createGain();
  master.gain.value = 1;
  master.connect(c.destination);
  // 갈색 잡음 4초 (물소리 바탕)
  const len = c.sampleRate * 4;
  noise = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = noise.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.04 * w) / 1.04;
      d[i] = last * 3.2 + w * 0.12;
    }
  }
  // 물: 갈색 잡음 + 높은 물보라 (가까울수록 필터가 열려 더 풍부)
  const ws = c.createBufferSource();
  ws.buffer = noise;
  ws.loop = true;
  const tone = c.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 500;
  const wg = c.createGain();
  wg.gain.value = 0;
  ws.connect(tone).connect(wg).connect(master);
  ws.start();
  // 잎: 높은 대역 잡음이 천천히 일렁임
  const ls = c.createBufferSource();
  ls.buffer = noise;
  ls.loop = true;
  ls.playbackRate.value = 1.7;
  const hp = c.createBiquadFilter();
  hp.type = 'bandpass';
  hp.frequency.value = 3200;
  hp.Q.value = 0.6;
  const lg = c.createGain();
  lg.gain.value = 0;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.13;
  const lfoAmt = c.createGain();
  lfoAmt.gain.value = 0.5;
  const sway = c.createGain();
  sway.gain.value = 0.6;
  lfo.connect(lfoAmt).connect(sway.gain);
  lfo.start();
  ls.connect(hp).connect(sway).connect(lg).connect(master);
  ls.start();
  layers = { water: { g: wg, tone }, leaves: { g: lg } };
}

/** 장소의 소리 섞임을 rampMs 동안 바꿈 (0~1) */
export function setWalkMix(next: WalkMix, rampMs = 3000) {
  const c = ctxReady();
  if (!c) return;
  ensure(c);
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
  mix = next;
  const t = c.currentTime, end = t + rampMs / 1000;
  const set = (p: AudioParam, v: number) => {
    p.cancelScheduledValues(t);
    p.setValueAtTime(p.value, t);
    p.linearRampToValueAtTime(v, end);
  };
  set(layers!.water.g.gain, 0.5 * next.water * next.water);
  set(layers!.water.tone.frequency, 380 + 1800 * next.water);
  set(layers!.leaves.g.gain, 0.07 * next.leaves);
  if (!birdTimer) scheduleBird();
}

function chirp(c: AudioContext, at: number, near: boolean) {
  const o = c.createOscillator();
  o.type = 'sine';
  const base = near ? 2600 + Math.random() * 1800 : 2000 + Math.random() * 1200;
  o.frequency.setValueAtTime(base, at);
  o.frequency.exponentialRampToValueAtTime(base * (0.7 + Math.random() * 0.8), at + 0.09);
  const g = c.createGain();
  const peak = near ? 0.05 : 0.012;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(peak, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.11);
  let out: AudioNode = g;
  if (!near) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    g.connect(lp);
    out = lp;
  }
  if (c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = (Math.random() * 2 - 1) * (near ? 0.6 : 0.9);
    out.connect(p);
    out = p;
  }
  o.connect(g);
  out.connect(master!);
  o.start(at);
  o.stop(at + 0.13);
}

function scheduleBird() {
  birdTimer = setTimeout(() => {
    birdTimer = null;
    const c = ctxReady();
    if (c && master) {
      const near = Math.random() < mix.birdsNear / Math.max(0.001, mix.birdsNear + mix.birdsFar);
      const amount = near ? mix.birdsNear : mix.birdsFar;
      if (amount > 0.02 && Math.random() < 0.4 + amount * 0.6) {
        const n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) chirp(c, c.currentTime + 0.02 + i * (0.13 + Math.random() * 0.08), near);
      }
    }
    if (mix.birdsNear + mix.birdsFar > 0.01) scheduleBird();
  }, 2500 + Math.random() * 6000);
}

function step(c: AudioContext) {
  if (!noise || !master) return;
  const at = c.currentTime + 0.01;
  const bursts = ground === 'snow' ? 3 : 6;
  for (let i = 0; i < bursts; i++) {
    const src = c.createBufferSource();
    src.buffer = noise;
    const bp = c.createBiquadFilter();
    bp.type = ground === 'snow' ? 'lowpass' : 'bandpass';
    bp.frequency.value = ground === 'snow' ? 900 : 1500 + Math.random() * 2200;
    bp.Q.value = 0.8;
    const g = c.createGain();
    const t = at + i * (ground === 'snow' ? 0.03 : 0.018) + Math.random() * 0.01;
    const peak = (ground === 'snow' ? 0.06 : 0.035) * (0.6 + Math.random() * 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (ground === 'snow' ? 0.12 : 0.05));
    src.connect(bp).connect(g).connect(master);
    // 잡음 버퍼의 다른 곳을 써서 매번 조금씩 다르게
    src.playbackRate.value = 4;
    src.start(t, Math.random() * 3, 0.2);
  }
}

/** 걷기 시작: 약 0.55초마다 발소리 */
export function startSteps(g: Ground = 'leaves') {
  const c = ctxReady();
  if (!c) return;
  ensure(c);
  ground = g;
  if (stepTimer) return;
  step(c);
  stepTimer = setInterval(() => {
    const cc = ctxReady();
    if (cc) step(cc);
  }, 560);
}

/** 멈춤: 발소리를 바로 그침(이미 난 소리는 0.1초 안에 잦아듦) */
export function stopSteps() {
  if (stepTimer) clearInterval(stepTimer);
  stepTimer = null;
}

/** 숲 거닐기를 떠남: 장소 소리를 천천히 줄임 */
export function stopWalk(fadeMs = 1500) {
  stopSteps();
  setWalkMix({ water: 0, leaves: 0, birdsNear: 0, birdsFar: 0 }, fadeMs);
}

/** 점검용 */
export function walkState() {
  return { mix, stepping: stepTimer != null };
}

// 자동 점검용: 장소 소리 섞임·발소리 상태를 브라우저 테스트에서 읽을 수 있게 (화면·기능에는 영향 없음)
if (typeof window !== 'undefined') (window as unknown as { __shimpyoWalk?: typeof walkState }).__shimpyoWalk = walkState;
