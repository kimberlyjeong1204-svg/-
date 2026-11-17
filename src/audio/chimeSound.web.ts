import { getContext } from './webAudio';

/**
 * 나무 풍경 소리 (웹) — 녹음 파일 없이 Web Audio로 만듦.
 * 속이 빈 나무 조각이 부딪히는 부드러운 「통」 소리: 짧은 타격음 + 금방 잦아드는 나무 울림(배음 2개).
 * 최종 풍경 녹음을 받으면 이 파일의 chimeHit만 바꾸면 됩니다.
 */
let noise: AudioBuffer | null = null;

// 조각 길이에 따른 음높이(길수록 낮음). 서로 어울리는 5음
const PITCH = [392, 440, 523.25, 587.33, 659.25];

/** index: 조각 번호, strength: 0~1 부딪힌 세기, pan: -1~1 */
export function chimeHit(index: number, strength: number, pan = 0) {
  const c = getContext();
  if (!c || c.state !== 'running') return;
  if (!noise) {
    noise = c.createBuffer(1, Math.round(c.sampleRate * 0.2), c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const at = c.currentTime + 0.005;
  const vol = 0.05 + 0.2 * Math.max(0, Math.min(1, strength));
  const f = PITCH[index % PITCH.length] * (0.995 + Math.random() * 0.01);
  const out = c.createGain();
  out.gain.value = vol;
  let last: AudioNode = out;
  if (c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(p);
    last = p;
  }
  last.connect(c.destination);
  // 타격음
  const n = c.createBufferSource();
  n.buffer = noise;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = f * 2.2;
  bp.Q.value = 1.4;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.5, at);
  ng.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
  n.connect(bp).connect(ng).connect(out);
  n.start(at, 0, 0.05);
  // 나무 울림: 기본음 + 나무 조각 특유의 배음(약 2.76배), 빨리 잦아듦
  for (const [mul, g, dur] of [[1, 1, 0.42], [2.76, 0.32, 0.16]] as const) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f * mul;
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, at);
    og.gain.linearRampToValueAtTime(g, at + 0.004);
    og.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(og).connect(out);
    o.start(at);
    o.stop(at + dur + 0.05);
  }
}
