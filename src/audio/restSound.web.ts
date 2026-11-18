import { Asset } from 'expo-asset';
import { audioOut, getContext, keepPlaying, loadBuffer } from './webAudio';

/**
 * 돗자리에 누워 쉴 때의 「자연음」 사이사이 소리 (웹)
 * 바탕의 낮은 바람은 숲 기본 소리(나뭇잎 사이 바람)가 맡고, 여기서는 가끔만:
 * - 멀리서 새가 한두 번 (밤 숲이라 드물게: 25~75초에 한 번, 1.5~4초, 작게)
 * - 가까운 풀벌레가 잠시 (30~90초에 한 번, 3~7초)
 * 음원의 아무 구간이나 잘라 앞뒤를 부드럽게 줄여 쓰므로 매번 길이·높이·음량이 달라짐. 바람만 들리는 시간이 넉넉함.
 * 오디오 시계로 미리 예약(화면 안에서는 1분 앞까지, 「화면을 꺼도 계속 듣기」로 화면 밖이면 30분 앞까지)
 */
const BIRDS = require('../../assets/sounds/walk/birds_far_loop.m4a');
const CRICKETS = require('../../assets/sounds/forest-crickets.m4a');

let on = false;
let timer: ReturnType<typeof setInterval> | null = null;
let out: GainNode | null = null;
let scheduledUntil = 0;
const buffers: { birds: AudioBuffer | null; crickets: AudioBuffer | null } = { birds: null, crickets: null };
let nextBird = 0;
let nextCricket = 0;
const sources = new Set<AudioBufferSourceNode>();
let events = 0;

function load() {
  if (!buffers.birds) loadBuffer(Asset.fromModule(BIRDS).uri).then((b) => (buffers.birds = b)).catch(() => {});
  if (!buffers.crickets) loadBuffer(Asset.fromModule(CRICKETS).uri).then((b) => (buffers.crickets = b)).catch(() => {});
}

function snippet(c: AudioContext, buf: AudioBuffer, at: number, len: number, vol: number, rate: number) {
  if (!out) return;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = c.createGain();
  const fade = Math.min(0.6, len / 3);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol, at + fade);
  g.gain.setValueAtTime(vol, at + len - fade);
  g.gain.linearRampToValueAtTime(0, at + len);
  src.connect(g).connect(out);
  const offset = Math.random() * Math.max(0, buf.duration - len * rate - 0.1);
  src.start(at, offset, len * rate + 0.05);
  sources.add(src);
  src.onended = () => {
    sources.delete(src);
    src.disconnect();
    g.disconnect();
  };
  events += 1;
}

function schedule() {
  const c = getContext();
  if (!c || !on) return;
  const ahead = keepPlaying() && typeof document !== 'undefined' && document.hidden ? 30 * 60 : 60;
  const until = c.currentTime + ahead;
  if (!nextBird) nextBird = c.currentTime + 6 + Math.random() * 10;
  if (!nextCricket) nextCricket = c.currentTime + 14 + Math.random() * 16;
  while (buffers.birds && nextBird < until) {
    const n = Math.random() < 0.35 ? 2 : 1; // 한두 번
    for (let i = 0; i < n; i++) snippet(c, buffers.birds, nextBird + i * (1.2 + Math.random() * 1.5), 1.5 + Math.random() * 2.5, 0.12 + Math.random() * 0.18, 0.95 + Math.random() * 0.1);
    nextBird += 25 + Math.random() * 50;
  }
  while (buffers.crickets && nextCricket < until) {
    snippet(c, buffers.crickets, nextCricket, 3 + Math.random() * 4, 0.15 + Math.random() * 0.2, 1);
    nextCricket += 30 + Math.random() * 60;
  }
  scheduledUntil = until;
}

/** 자연음 사이사이 소리 시작(천천히) */
export function startNature(fadeMs = 2000) {
  const c = getContext();
  if (!c) return;
  load();
  if (!out) {
    out = c.createGain();
    out.connect(audioOut(c));
  }
  out.gain.cancelScheduledValues(c.currentTime);
  out.gain.setValueAtTime(out.gain.value, c.currentTime);
  out.gain.linearRampToValueAtTime(1, c.currentTime + fadeMs / 1000);
  if (on) return;
  on = true;
  nextBird = 0;
  nextCricket = 0;
  schedule();
  timer = setInterval(schedule, 5000);
}

/** 멈춤: 천천히 줄이고 예약한 소리를 모두 지움 */
export function stopNature(fadeMs = 2000) {
  const c = getContext();
  on = false;
  if (timer) clearInterval(timer);
  timer = null;
  if (!c || !out) return;
  out.gain.cancelScheduledValues(c.currentTime);
  out.gain.setValueAtTime(out.gain.value, c.currentTime);
  out.gain.linearRampToValueAtTime(0, c.currentTime + fadeMs / 1000);
  setTimeout(() => {
    if (on) return;
    for (const s of sources) {
      try {
        s.stop();
      } catch {
        // 이미 멈춤
      }
    }
    sources.clear();
  }, fadeMs + 100);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && keepPlaying()) schedule();
  });
}
if (typeof window !== 'undefined') {
  (window as unknown as { __shimpyoNature?: () => unknown }).__shimpyoNature = () => ({ on, events, scheduledUntil: Math.round(scheduledUntil), pending: sources.size });
}
