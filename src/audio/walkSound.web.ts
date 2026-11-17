import { Asset } from 'expo-asset';
import { BufferLoopPlayer } from './bufferLoopPlayer.web';
import { getContext, loadBuffer } from './webAudio';
import { FOOTSTEPS, WALK_LOOPS } from './walkSounds';

/**
 * 숲 거닐기 장소 소리 (웹)
 * 숲 기본 자연음(귀뚜라미·바람)은 숲 공간이 그대로 맡고, 여기서는 장소 소리 5층만 볼륨으로 섞습니다.
 * - 폭포 가까이/멀리, 나뭇잎, 새 가까이/멀리: 각각 끊김 없는 반복 재생(Web Audio 버퍼), 장소를 옮기면 2~4초에 걸쳐 볼륨만 바뀜
 *   (재생을 새로 시작하지 않아 끊김·중복 없음, 소리가 0이 되면 잠시 멈춤)
 * - 발소리: 걷는 동안만 0.55초마다 4개 중 하나(같은 소리 연속 방지), 멈추면 바로 그침
 * 음원은 자산 v1의 합성 프로토타입(walkSounds.ts) — 실제 자연 녹음으로 교체 예정.
 */
export type WalkMix = { waterNear: number; waterFar: number; leaves: number; birdsNear: number; birdsFar: number };
export type Ground = 'leaves' | 'snow';
type Layer = keyof WalkMix;

const LAYERS: Layer[] = ['waterNear', 'waterFar', 'leaves', 'birdsNear', 'birdsFar'];
/** 층마다 최대 음량(숲 기본 소리와 어울리게) */
const LEVEL: WalkMix = { waterNear: 0.55, waterFar: 0.4, leaves: 0.35, birdsNear: 0.32, birdsFar: 0.25 };

const players = new Map<Layer, BufferLoopPlayer>();
let mix: WalkMix = { waterNear: 0, waterFar: 0, leaves: 0, birdsNear: 0, birdsFar: 0 };
let stepTimer: ReturnType<typeof setInterval> | null = null;
let lastStep = -1;
const stepBuffers: Record<Ground, (AudioBuffer | null)[]> = { leaves: [null, null, null, null], snow: [null, null, null, null] };

function ready() {
  const c = getContext();
  return c && c.state === 'running' ? c : null;
}

/** 장소의 소리 섞임을 rampMs 동안 바꿈 (0~1) */
export function setWalkMix(next: WalkMix, rampMs = 3000) {
  mix = next;
  if (!ready()) return;
  for (const k of LAYERS) {
    const v = next[k] * LEVEL[k];
    let p = players.get(k);
    if (v <= 0.001) {
      p?.pause(rampMs);
      continue;
    }
    if (!p) {
      p = new BufferLoopPlayer();
      players.set(k, p);
    }
    p.setVolume(v, rampMs);
    if (p.currentKey === 'none') void p.playTrack(WALK_LOOPS[k], rampMs);
    else if (!p.isPlaying) p.resume(rampMs);
  }
}

function loadSteps(g: Ground) {
  FOOTSTEPS[g].forEach((src, i) => {
    if (stepBuffers[g][i]) return;
    loadBuffer(Asset.fromModule(src).uri)
      .then((b) => {
        stepBuffers[g][i] = b;
      })
      .catch(() => {});
  });
}

function step(g: Ground) {
  const c = ready();
  if (!c) return;
  const choices = stepBuffers[g].map((b, i) => (b ? i : -1)).filter((i) => i >= 0 && i !== lastStep);
  if (!choices.length) return;
  const i = choices[Math.floor(Math.random() * choices.length)];
  lastStep = i;
  const src = c.createBufferSource();
  src.buffer = stepBuffers[g][i];
  src.playbackRate.value = 0.95 + Math.random() * 0.1;
  const gain = c.createGain();
  gain.gain.value = 0.45 + Math.random() * 0.15;
  src.connect(gain).connect(c.destination);
  src.onended = () => {
    src.disconnect();
    gain.disconnect();
  };
  src.start(c.currentTime + 0.01);
}

/** 걷기 시작: 약 0.55초마다 발소리 */
export function startSteps(g: Ground = 'leaves') {
  loadSteps(g);
  if (stepTimer) return;
  step(g);
  stepTimer = setInterval(() => step(g), 550);
}

/** 멈춤: 발소리를 바로 그침 */
export function stopSteps() {
  if (stepTimer) clearInterval(stepTimer);
  stepTimer = null;
}

/** 숲 거닐기를 떠남: 장소 소리를 천천히 줄임 */
export function stopWalk(fadeMs = 1500) {
  stopSteps();
  mix = { waterNear: 0, waterFar: 0, leaves: 0, birdsNear: 0, birdsFar: 0 };
  for (const p of players.values()) p.pause(fadeMs);
}

/** 점검용 */
export function walkState() {
  return { mix, stepping: stepTimer != null, playing: [...players.entries()].filter(([, p]) => p.isPlaying).map(([k]) => k) };
}

// 자동 점검용: 브라우저 테스트에서 상태를 읽을 수 있게 (화면·기능에는 영향 없음)
if (typeof window !== 'undefined') (window as unknown as { __shimpyoWalk?: typeof walkState }).__shimpyoWalk = walkState;
