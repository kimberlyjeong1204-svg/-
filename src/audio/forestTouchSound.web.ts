import { getContext, audioOut } from './webAudio';

/** 숲을 만졌을 때 잎이 스치는 아주 작은 소리 (웹, 녹음 파일 없이 만듦). 소리를 켰을 때만 부름 */
let noise: AudioBuffer | null = null;

export function leafRustle(pan = 0) {
  const c = getContext();
  if (!c || c.state !== 'running') return;
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime + 0.01;
  const src = c.createBufferSource();
  src.buffer = noise;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2400;
  bp.Q.value = 0.5;
  const g = c.createGain();
  // 잎 여러 장이 스치듯 작게 떨리는 크기
  const n = 24;
  const curve = Float32Array.from({ length: n }, (_, i) => (Math.sin((i / (n - 1)) * Math.PI) * (0.5 + Math.random() * 0.5)) * 0.06);
  g.gain.setValueAtTime(0, t0);
  g.gain.setValueCurveAtTime(curve, t0, 0.7);
  let out: AudioNode = g;
  if (c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p);
    out = p;
  }
  src.connect(bp).connect(g);
  out.connect(audioOut(c));
  src.start(t0, Math.random() * 0.2, 0.75);
}
