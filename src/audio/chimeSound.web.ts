import { Asset } from 'expo-asset';
import { getContext, loadBuffer } from './webAudio';
import { MAX_VOICES, WINDCHIME_TAPS } from './windchimeSounds';

/**
 * 나무 풍경 소리 (웹)
 * 조각끼리 실제로 부딪힐 때만 효과음 10개 중 하나를 골라 재생합니다(같은 소리 연속 방지).
 * 숲소리와 같은 AudioContext로 섞이므로 별도 재생 엔진을 만들지 않습니다.
 * 소리는 사용자가 숲소리를 켠 뒤(=화면을 누른 뒤)에만 납니다. 오디오가 잠겨 있으면 울리지 않습니다.
 */
let buffers: (AudioBuffer | null)[] = WINDCHIME_TAPS.map(() => null);
let loading: Promise<void> | null = null;
let voices = 0;
let lastIndex = -1;

/** 풍경 흔들기를 열 때 미리 불러 둠 (첫 충돌부터 바로 울리게) */
export function preloadChime() {
  if (loading) return loading;
  loading = Promise.all(
    WINDCHIME_TAPS.map((src, i) =>
      loadBuffer(Asset.fromModule(src).uri)
        .then((b) => {
          buffers[i] = b;
        })
        .catch(() => {}),
    ),
  ).then(() => {});
  return loading;
}

/** piece: 조각 번호(0~4), strength: 부딪힌 세기 0~1, pan: -1~1 */
export function chimeHit(piece: number, strength: number, pan = 0) {
  const c = getContext();
  if (!c || c.state !== 'running') return;
  if (voices >= MAX_VOICES) return;
  const ready = buffers.map((b, i) => (b ? i : -1)).filter((i) => i >= 0 && i !== lastIndex);
  if (ready.length === 0) {
    void preloadChime();
    return;
  }
  const idx = ready[Math.floor(Math.random() * ready.length)];
  lastIndex = idx;
  const src = c.createBufferSource();
  src.buffer = buffers[idx];
  // 조각마다 길이가 달라 아주 조금 다른 높이로
  src.playbackRate.value = [1.06, 0.97, 1.02, 0.94, 1.1][piece % 5] * (0.99 + Math.random() * 0.02);
  const g = c.createGain();
  const s = Math.max(0, Math.min(1, strength));
  g.gain.value = 0.12 + 0.5 * s * s; // 약하게 닿으면 아주 작게
  let out: AudioNode = g;
  if (c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan)) * 0.6;
    g.connect(p);
    out = p;
  }
  src.connect(g);
  out.connect(c.destination);
  voices += 1;
  src.onended = () => {
    voices -= 1;
    src.disconnect();
    g.disconnect();
  };
  src.start(c.currentTime + 0.005);
}

/** 점검용 */
export function chimeVoices() {
  return voices;
}
