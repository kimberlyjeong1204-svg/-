import { Asset } from 'expo-asset';
import { MUSIC, type MusicKey } from './music';
import { audioOut, getContext, setAmbientSession } from './webAudio';

/**
 * 음악 한 곡씩 (웹) — 동굴 재즈, 누워 쉬기 명상음악이 함께 씀
 * - 곡마다 <audio> 요소 하나(끝에서 처음으로 반복)를 Web Audio로 이어 음량을 조절(아이폰은 요소 음량을 못 바꿈)
 * - 모든 소리와 같은 길(audioOut)로 나가므로 「화면을 꺼도 계속 듣기」에서도 이어짐
 * - 곡을 바꾸면 이전 곡은 천천히 줄고 새 곡이 천천히 커짐. 멈추면 그 자리를 기억해, 다시 고르면 이어서
 * - 화면을 오가도(동굴 전체 ↔ 불 가까이 보기) 모듈이 그대로라 같은 곡·같은 위치로 계속
 */
type Voice = { el: HTMLAudioElement; gain: GainNode; stopTimer: ReturnType<typeof setTimeout> | null };
const voices = new Map<MusicKey, Voice>();
let current: MusicKey | null = null;

function voice(key: MusicKey): Voice | null {
  const c = getContext();
  if (!c) return null;
  let v = voices.get(key);
  if (v) return v;
  const el = new Audio();
  el.src = Asset.fromModule(MUSIC[key].source).uri;
  el.loop = true;
  el.preload = 'auto';
  el.setAttribute('playsinline', '');
  const src = c.createMediaElementSource(el);
  const gain = c.createGain();
  gain.gain.value = 0;
  src.connect(gain).connect(audioOut(c));
  v = { el, gain, stopTimer: null };
  voices.set(key, v);
  return v;
}

function ramp(v: Voice, to: number, ms: number) {
  const c = getContext();
  if (!c) return;
  const now = c.currentTime;
  v.gain.gain.cancelScheduledValues(now);
  v.gain.gain.setValueAtTime(v.gain.gain.value, now);
  v.gain.gain.linearRampToValueAtTime(to, now + ms / 1000);
}

/** 곡 재생(같은 곡이면 이어서). 화면을 누른 순간에 불러야 아이폰이 허락함 */
export function playMusic(key: MusicKey, fadeMs = 2500) {
  const c = getContext();
  if (!c) return;
  setAmbientSession();
  if (c.state !== 'running') void c.resume().catch(() => {});
  if (current && current !== key) stopMusic(fadeMs);
  const v = voice(key);
  if (!v) return;
  if (v.stopTimer) {
    clearTimeout(v.stopTimer);
    v.stopTimer = null;
  }
  current = key;
  void v.el.play().catch(() => {});
  ramp(v, MUSIC[key].gain, fadeMs);
}

/** 지금 곡을 천천히 멈춤(위치는 기억) */
export function stopMusic(fadeMs = 2500) {
  if (!current) return;
  const v = voices.get(current);
  current = null;
  if (!v) return;
  ramp(v, 0, fadeMs);
  if (v.stopTimer) clearTimeout(v.stopTimer);
  v.stopTimer = setTimeout(() => {
    v.stopTimer = null;
    v.el.pause();
  }, fadeMs + 100);
}

export function currentMusic() {
  return current;
}

// 점검용
if (typeof window !== 'undefined') {
  (window as unknown as { __shimpyoMusic?: () => unknown }).__shimpyoMusic = () => ({
    current,
    playing: [...voices.entries()].filter(([, v]) => !v.el.paused).map(([k, v]) => ({ key: k, t: Math.round(v.el.currentTime), gain: +v.gain.gain.value.toFixed(2) })),
  });
}
