import { getContext, setAmbientSession } from './webAudio';

/**
 * 동굴 소리 (웹) — 녹음 파일 없이 Web Audio로 만듦 (라이선스 걱정 없음, 바꾸기 쉬움)
 * - 장작불: 낮은 불 소리 + 불규칙한 타닥 소리. 종이를 태우면 잠깐 더 타오름
 * - 동굴 공간감: 짧게 만든 잔향(컨볼버)으로 돌·타닥 소리에 울림
 * - 조약돌: 벽에 닿는 딱 소리 + 짧은 둔탁함 + 울림, 작게 한 번 더 튐
 * - 종이: 찢는 소리 / 불에 넣을 때 화르륵
 * 소리를 켰을 때만 호출됩니다. 아이폰 무음 스위치를 따릅니다(ambient).
 */

let master: GainNode | null = null;
let reverb: ConvolverNode | null = null;
let reverbIn: GainNode | null = null;
let noise: AudioBuffer | null = null;
let rumble: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let crackleTimer: ReturnType<typeof setInterval> | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let intensity = 1;
/** 장작불 음량(0~1, 환경음 설정). 동굴의 모든 소리(불·조약돌·종이·장작)에 함께 적용 */
let fireVolume = 1;
let fireActive = false;
let flareUntil = 0;

function setup(c: AudioContext) {
  if (master) return;
  master = c.createGain();
  master.gain.value = 0;
  master.connect(c.destination);
  // 백색 잡음 2초
  noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // 동굴 잔향: 2.4초 동안 줄어드는 잡음(좌우 다르게)
  const len = Math.round(c.sampleRate * 2.4);
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const x = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < c.sampleRate * 0.012 ? 0.2 : 1);
  }
  reverb = c.createConvolver();
  reverb.buffer = ir;
  reverbIn = c.createGain();
  reverbIn.gain.value = 0.5;
  reverbIn.connect(reverb).connect(master);
}

function noiseBurst(c: AudioContext, at: number, dur: number, freq: number, q: number, peak: number, wet = 0.15, pan = 0) {
  if (!noise || !master || !reverbIn) return;
  const src = c.createBufferSource();
  src.buffer = noise;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + 0.0015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  let out: AudioNode = g;
  if (pan && c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = pan;
    g.connect(p);
    out = p;
  }
  src.connect(bp).connect(g);
  out.connect(master);
  if (wet > 0) {
    const w = c.createGain();
    w.gain.value = wet;
    out.connect(w).connect(reverbIn);
  }
  src.start(at, Math.random() * 1.5, dur + 0.05);
}

function crackleTick() {
  const c = getContext();
  if (!c || c.state !== 'running') return;
  const flaring = c.currentTime < flareUntil;
  const level = intensity * (flaring ? 2.2 : 1);
  // 0.06초마다: 가끔 타닥, 가끔 연달아
  const n = Math.random() < 0.18 * level ? (Math.random() < 0.25 ? 3 : 1) : 0;
  for (let i = 0; i < n; i++) {
    const at = c.currentTime + 0.02 + Math.random() * 0.05 + i * (0.015 + Math.random() * 0.04);
    noiseBurst(c, at, 0.006 + Math.random() * 0.03, 1400 + Math.random() * 3600, 1.2 + Math.random(), (0.05 + Math.random() * 0.22) * Math.min(1.6, level), 0.18, (Math.random() - 0.5) * 0.3);
  }
}

/** 동굴에 들어옴: 불 소리를 천천히 키움 */
export function startCaveFire(fadeMs = 3000) {
  const c = getContext();
  if (!c) return;
  setAmbientSession();
  if (c.state !== 'running') void c.resume().catch(() => {});
  setup(c);
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
  if (!rumble && noise && master) {
    const src = c.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    const gain = c.createGain();
    gain.gain.value = 0.22;
    src.connect(lp).connect(gain).connect(master);
    src.start();
    rumble = { src, gain };
  }
  if (!crackleTimer) crackleTimer = setInterval(crackleTick, 60);
  const now = c.currentTime;
  fireActive = true;
  master!.gain.cancelScheduledValues(now);
  master!.gain.setValueAtTime(master!.gain.value, now);
  master!.gain.linearRampToValueAtTime(0.9 * fireVolume, now + fadeMs / 1000);
}

/** 환경음 설정의 장작불 음량 (0이면 동굴 소리 없음) */
export function setCaveFireVolume(v: number, rampMs = 300) {
  fireVolume = Math.max(0, Math.min(1, v));
  const c = getContext();
  if (!c || !master || !fireActive) return;
  const now = c.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0.9 * fireVolume, now + rampMs / 1000);
}

/** 동굴을 나감: 천천히 줄이고 멈춤 */
export function stopCaveFire(fadeMs = 2500) {
  const c = getContext();
  if (!c || !master) return;
  const now = c.currentTime;
  fireActive = false;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);
  if (stopTimer) clearTimeout(stopTimer);
  stopTimer = setTimeout(() => {
    stopTimer = null;
    if (crackleTimer) clearInterval(crackleTimer);
    crackleTimer = null;
    try {
      rumble?.src.stop();
    } catch {
      // 이미 멈춤
    }
    rumble = null;
  }, fadeMs + 100);
}

/** 종이를 불에 넣음: 화르륵 + 몇 초 동안 더 타오름 */
export function fireFlare() {
  const c = getContext();
  if (!c || !noise || !master) return;
  flareUntil = c.currentTime + 3.2;
  const src = c.createBufferSource();
  src.buffer = noise;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(300, c.currentTime);
  lp.frequency.exponentialRampToValueAtTime(1600, c.currentTime + 0.8);
  lp.frequency.exponentialRampToValueAtTime(400, c.currentTime + 2.6);
  const g = c.createGain();
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(0.16, c.currentTime + 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 2.8);
  src.connect(lp).connect(g).connect(master);
  src.start(c.currentTime, 0, 3);
}

let lastLog = 0;
/** 장작이 불 안에 놓임: 둔탁하게 닿는 소리 + 타닥 몇 번 + 잠깐 화르륵 (0.6초 안에 다시 부르면 무시 → 겹침 방지) */
export function logDrop() {
  const c = getContext();
  if (!c || !noise || !master || !reverbIn) return;
  if (c.currentTime - lastLog < 0.6) return;
  lastLog = c.currentTime;
  const at = c.currentTime + 0.01;
  // 나무가 닿는 둔탁한 소리
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(130, at);
  o.frequency.exponentialRampToValueAtTime(70, at + 0.12);
  const og = c.createGain();
  og.gain.setValueAtTime(0.0001, at);
  og.gain.linearRampToValueAtTime(0.32, at + 0.004);
  og.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
  o.connect(og);
  og.connect(master);
  const w = c.createGain();
  w.gain.value = 0.35;
  og.connect(w).connect(reverbIn);
  o.start(at);
  o.stop(at + 0.25);
  noiseBurst(c, at, 0.05, 700, 1.4, 0.22, 0.3);
  // 숯이 흩어지는 타닥
  for (let i = 0; i < 6; i++) noiseBurst(c, at + 0.08 + Math.random() * 0.5, 0.008 + Math.random() * 0.02, 1800 + Math.random() * 3000, 1.5, 0.1 + Math.random() * 0.12, 0.2, (Math.random() - 0.5) * 0.4);
  // 불이 잠깐 커짐
  fireFlare();
}

/** 종이 찢는 소리 */
export function paperTear() {
  const c = getContext();
  if (!c || !noise) return;
  const t0 = c.currentTime + 0.01;
  for (let i = 0; i < 9; i++) noiseBurst(c, t0 + i * 0.045 + Math.random() * 0.02, 0.05 + Math.random() * 0.04, 2600 + Math.random() * 2400, 0.9, 0.12 + Math.random() * 0.08, 0.1);
}

/** 조약돌이 벽에 닿음. pan: -1(왼쪽)~1(오른쪽), size: 0.6~1.4 */
export function pebbleHit(pan = 0, size = 1) {
  const c = getContext();
  if (!c || !master || !reverbIn) return;
  const at = c.currentTime + 0.01;
  // 딱
  noiseBurst(c, at, 0.018, 2200 / size, 2.2, 0.55, 0.65, pan);
  // 둔탁한 몸통
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(240 / size, at);
  o.frequency.exponentialRampToValueAtTime(120 / size, at + 0.08);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(0.25, at + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
  o.connect(g);
  g.connect(master);
  const w = c.createGain();
  w.gain.value = 0.7;
  g.connect(w).connect(reverbIn);
  o.start(at);
  o.stop(at + 0.15);
  // 바닥에 작게 한 번 더
  noiseBurst(c, at + 0.32 + Math.random() * 0.08, 0.014, 3000, 2, 0.14, 0.5, pan * 0.6);
}

/** 테스트·점검용: 동굴 소리가 켜져 있는지 */
export function caveFireActive() {
  return rumble != null && stopTimer == null;
}

if (typeof window !== 'undefined') (window as unknown as { __shimpyoCave?: () => unknown }).__shimpyoCave = () => ({ active: caveFireActive(), volume: fireVolume });
