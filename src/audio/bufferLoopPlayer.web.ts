import { Asset } from 'expo-asset';
import type { Ambience, TrackKey } from './sounds';
import { equalPowerIn, equalPowerOut, existingContext, getContext, loadBuffer, setAmbientSession, wakeContext } from './webAudio';

/**
 * 웹(PWA)용 끊김 없는 반복 재생기 — 숲 소리 전용
 *
 * 왜 따로 만들었나:
 * 예전 방식은 반복 이음새마다 두 번째 <audio>를 play()로 새로 시작했습니다. 아이폰 Safari는 화면을 누르지 않은 때에
 * 시작하는 오디오 요소를 막을 수 있어서, 처음 몇십 초는 들리다가 이음새(바람 약 22초, 귀뚜라미 약 39초)에서 끊겼습니다.
 *
 * 이 재생기는 음원을 한 번 풀어(Web Audio 버퍼) 오디오 시계에 맞춰 미리 예약해 둡니다.
 * - 오디오를 한 번 깨운 뒤에는(화면 터치 한 번) 이음새에서 새로 허락받을 일이 없음
 * - 이음새는 앞 구간이 끝나기 전 crossfade초 동안 등가 전력 곡선으로 겹침 → 소리 크기가 일정
 * - 다음 구간을 몇 초 앞서 예약하므로 화면이 바빠도 이음새가 늦지 않음
 * - 소리 켜기/끄기·음량 변경은 전체 음량(마스터)만 부드럽게 바꿈 → 재생을 다시 시작하지 않음
 */

type Segment = { src: AudioBufferSourceNode; env: GainNode; start: number; end: number };
/** 전체 음량 0~1의 직선 변화(오디오 시계 기준). 진행 중인 값 계산용 */
type LevelRamp = { from: number; to: number; t0: number; t1: number };

const START_DELAY = 0.06;
const LOOKAHEAD_SEC = 6;
const SCHEDULER_MS = 500;

export class BufferLoopPlayer {
  private track: Ambience | null = null;
  private buffer: AudioBuffer | null = null;
  private out: GainNode | null = null;
  private segments: Segment[] = [];
  private paused = false;
  private generation = 0;
  private scheduler: ReturnType<typeof setInterval> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private loadFailed = false;
  private userVolume = 1;
  private level: LevelRamp = { from: 0, to: 0, t0: 0, t1: 0 };

  get currentKey(): TrackKey | 'none' {
    return this.track?.key ?? 'none';
  }

  /** 재생 중(일시정지·정지 아님) */
  get isPlaying(): boolean {
    return this.track != null && !this.paused;
  }

  /** 재생하려 하지만 오디오가 잠겨 있거나 음원을 못 불러와 소리가 안 나는 상태 */
  get playbackBlocked(): boolean {
    if (!this.isPlaying) return false;
    if (this.loadFailed) return true;
    const c = existingContext();
    return c != null && c.state !== 'running';
  }

  /** 실제로 소리가 나고 있는지 (음원 준비 + 예약된 구간 있음 + 오디오가 깨어 있음) */
  get isSounding(): boolean {
    const c = existingContext();
    return this.isPlaying && this.segments.length > 0 && c != null && c.state === 'running';
  }

  setVolume(volume: number, rampMs = 300) {
    this.userVolume = Math.max(0, Math.min(1, volume));
    const c = existingContext();
    if (!c || !this.out) return;
    // 진행 중인 페이드는 그대로 이어 가되, 목표 음량만 새 음량으로
    const now = c.currentTime;
    const remaining = Math.max(rampMs / 1000, this.level.t1 - now);
    this.rampLevel(this.level.to, remaining * 1000);
  }

  async playTrack(track: Ambience, fadeInMs = 1500) {
    if (this.track?.key === track.key && this.out) {
      this.resume(fadeInMs);
      return;
    }
    const gen = ++this.generation;
    this.releaseNow();
    this.track = track;
    this.paused = false;
    this.loadFailed = false;
    setAmbientSession();
    const c = getContext();
    if (!c) {
      this.loadFailed = true;
      return;
    }
    // 화면을 누르기 전에는 끝나지 않을 수 있어 기다리지 않음 (예약한 소리는 오디오가 깨면 그때부터 나옴)
    if (c.state !== 'running') void c.resume().catch(() => {});

    const out = c.createGain();
    out.gain.value = 0;
    out.connect(c.destination);
    this.out = out;
    this.level = { from: 0, to: 0, t0: c.currentTime, t1: c.currentTime };

    let buffer: AudioBuffer;
    try {
      const uri = Asset.fromModule(track.source).uri;
      buffer = await loadBuffer(uri);
    } catch {
      if (gen === this.generation) this.loadFailed = true;
      return;
    }
    if (gen !== this.generation) return;
    this.buffer = buffer;
    if (this.paused) return;
    this.startSegments(c.currentTime + START_DELAY);
    this.rampLevel(1, fadeInMs);
  }

  pause(fadeMs = 500) {
    if (this.paused || !this.track) return;
    this.paused = true;
    this.rampLevel(0, fadeMs);
    // 다 줄어든 뒤 예약한 구간을 멈춤 (다시 켜면 처음 지점부터 부드럽게)
    if (this.stopTimer) clearTimeout(this.stopTimer);
    const gen = this.generation;
    this.stopTimer = setTimeout(() => {
      this.stopTimer = null;
      if (this.paused && gen === this.generation) this.stopSegments();
    }, fadeMs + 80);
  }

  resume(fadeInMs = 1000) {
    if (!this.track) return;
    const c = getContext();
    if (!c) return;
    if (c.state !== 'running') void c.resume().catch(() => {});
    this.paused = false;
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    // 아직 소리가 이어지고 있으면(멈춤 페이드 중) 그대로 다시 키우기만 함 → 끊김 없음
    if (this.segments.length === 0 && this.buffer) this.startSegments(c.currentTime + START_DELAY);
    this.rampLevel(1, fadeInMs);
  }

  /** 사용자가 누른 순간에 오디오를 깨우고, 음원을 못 불러왔으면 다시 시도 */
  retry() {
    wakeContext();
    const track = this.track;
    if (!track || this.paused) return;
    if (this.loadFailed || !this.buffer) {
      this.track = null;
      void this.playTrack(track, 800);
    }
  }

  fadeOutAndStop(fadeMs = 3000) {
    if (!this.track) return;
    const gen = ++this.generation;
    this.paused = true;
    this.rampLevel(0, fadeMs);
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.stopTimer = setTimeout(() => {
      this.stopTimer = null;
      if (gen === this.generation) this.releaseNow();
    }, fadeMs + 80);
  }

  // ─── 내부 ─────────────────────────────────────────────

  /** 첫 구간을 when에 시작하고, 이어지는 구간은 스케줄러가 미리 예약 */
  private startSegments(when: number) {
    this.addSegment(when, false);
    this.ensureScheduler();
  }

  private addSegment(when: number, fadeIn: boolean) {
    const c = existingContext();
    const track = this.track;
    const buffer = this.buffer;
    if (!c || !track || !buffer || !this.out) return;
    const loopStart = Math.min(track.loopStart, buffer.duration - 1);
    const loopEnd = Math.min(track.loopEnd, buffer.duration);
    const dur = loopEnd - loopStart;
    const cf = Math.min(track.crossfade, dur / 3);

    const src = c.createBufferSource();
    src.buffer = buffer;
    const env = c.createGain();
    src.connect(env).connect(this.out);
    if (fadeIn) {
      env.gain.setValueAtTime(0, when);
      env.gain.setValueCurveAtTime(equalPowerIn(64), when, cf);
      // 앞 구간은 같은 시간 동안 줄어듦
      const prev = this.segments[this.segments.length - 1];
      if (prev) prev.env.gain.setValueCurveAtTime(equalPowerOut(64), when, cf);
    } else {
      env.gain.value = 1;
    }
    src.start(when, loopStart, dur);
    const seg: Segment = { src, env, start: when, end: when + dur };
    src.onended = () => {
      try {
        src.disconnect();
        env.disconnect();
      } catch {
        // 이미 끊김
      }
      this.segments = this.segments.filter((s) => s !== seg);
    };
    this.segments.push(seg);
  }

  private ensureScheduler() {
    if (this.scheduler) return;
    this.scheduler = setInterval(() => this.schedule(), SCHEDULER_MS);
    this.schedule();
  }

  /** 마지막 구간이 끝나기 crossfade초 전에 다음 구간이 겹쳐 시작하도록, 몇 초 앞서 예약 */
  private schedule() {
    const c = existingContext();
    const track = this.track;
    if (!c || !track || this.paused || !this.buffer) return;
    const last = this.segments[this.segments.length - 1];
    if (!last) return;
    const cf = Math.min(track.crossfade, (last.end - last.start) / 3);
    const nextStart = last.end - cf;
    if (nextStart - c.currentTime < LOOKAHEAD_SEC) this.addSegment(Math.max(nextStart, c.currentTime + 0.02), true);
  }

  /** 전체 음량 바꾸기 (0~1, 사용자 음량·트랙 보정은 자동 반영) */
  private rampLevel(to: number, ms: number) {
    const c = existingContext();
    const out = this.out;
    if (!c || !out) {
      this.level = { from: to, to, t0: 0, t1: 0 };
      return;
    }
    const now = c.currentTime;
    const current = this.levelAt(now);
    const sec = Math.max(0.02, ms / 1000);
    const scale = (this.track?.gain ?? 1) * this.userVolume;
    const g = out.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(current * this.levelScaleAt(), now);
    g.linearRampToValueAtTime(to * scale, now + sec);
    this.level = { from: current, to, t0: now, t1: now + sec };
    this.lastScale = scale;
  }

  private lastScale = 1;
  private levelScaleAt() {
    return this.lastScale;
  }

  private levelAt(t: number) {
    const { from, to, t0, t1 } = this.level;
    if (t >= t1) return to;
    if (t <= t0) return from;
    return from + ((to - from) * (t - t0)) / (t1 - t0);
  }

  private stopSegments() {
    for (const s of this.segments) {
      s.src.onended = null;
      try {
        s.src.stop();
      } catch {
        // 아직 시작 전이거나 이미 멈춤
      }
      try {
        s.src.disconnect();
        s.env.disconnect();
      } catch {
        // 이미 끊김
      }
    }
    this.segments = [];
    if (this.scheduler) clearInterval(this.scheduler);
    this.scheduler = null;
  }

  private releaseNow() {
    this.stopSegments();
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.stopTimer = null;
    try {
      this.out?.disconnect();
    } catch {
      // 이미 끊김
    }
    this.out = null;
    this.buffer = null;
    this.track = null;
    this.loadFailed = false;
    this.level = { from: 0, to: 0, t0: 0, t1: 0 };
  }
}
