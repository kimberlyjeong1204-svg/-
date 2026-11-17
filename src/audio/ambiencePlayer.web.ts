import { Asset } from 'expo-asset';
import { AMBIENCES, isAmbience, type Ambience, type SoundKey, type TrackKey } from './sounds';
import { BufferLoopPlayer } from './bufferLoopPlayer.web';
import { equalPowerIn, equalPowerOut, existingContext, getContext, setAmbientSession } from './webAudio';

/**
 * 웹앱(PWA)용 환경음 재생기. 네이티브(ambiencePlayer.ts)와 같은 방식으로 동작합니다.
 *
 * - 아이폰 Safari는 audio.volume을 바꿀 수 없어서, Web Audio의 GainNode로 볼륨을 조절합니다.
 * - 끊김 없는 반복: 두 개의 audio 요소를 번갈아 쓰며 반복 구간 끝에서 몇 초 겹쳐 넘깁니다.
 * - Safari 17+에서는 오디오 종류를 'ambient'로 지정해 다른 앱 음악과 섞이고 무음 스위치를 따릅니다.
 * - 브라우저는 사용자가 화면을 누른 뒤에만 소리를 낼 수 있어, 첫 터치 때 오디오를 준비합니다.
 */

type Voice = { el: HTMLAudioElement; gain: GainNode | null; level: number; doneTimer: ReturnType<typeof setTimeout> | null };

// 이 재생기(빗소리)는 오디오 요소를 씁니다: 수 분짜리 음원도 메모리를 적게 씀.
// 숲 소리처럼 끊김 없이 오래 반복해야 하는 짧은 음원은 bufferLoopPlayer.web.ts(Web Audio 버퍼)를 씁니다.

export class WebAmbiencePlayer {
  private track: Ambience | null = null;
  private voices: [Voice, Voice] | null = null;
  private active = 0;
  private paused = false;
  private crossfading = false;
  private monitor: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  /** 사용자가 정한 음량(0~1). 숲 소리처럼 트랙마다 음량을 조절할 때 씁니다. 기본 1 */
  private userVolume = 1;
  /** 브라우저가 재생을 막았는지 (화면을 누르기 전 자동 재생 제한 등) */
  private blocked = false;
  /** play()가 성공해 실제로 재생이 시작됐는지 */
  private confirmed = false;

  get currentKey(): TrackKey | 'none' {
    return this.track?.key ?? 'none';
  }

  /** 사용자 음량을 부드럽게 바꿉니다 (0~1) */
  setVolume(volume: number, rampMs = 300) {
    this.userVolume = Math.max(0, Math.min(1, volume));
    if (!this.voices || this.paused) return;
    // 지금 들리는 소리만 같은 단계 그대로 새 음량으로 옮깁니다(크로스페이드 중이 아닐 때).
    if (this.crossfading) return;
    const v = this.voices[this.active];
    if (v.level > 0) this.ramp(v, v.level, rampMs);
  }

  get isPlaying(): boolean {
    return this.voices != null && !this.paused;
  }

  /**
   * 재생하려 했지만 실제로는 소리가 나지 않는 상태인지.
   * (브라우저가 재생을 막았거나, 오디오가 아직 잠겨 있음) 이때는 「켜짐」으로 보이면 안 됩니다.
   */
  get playbackBlocked(): boolean {
    if (!this.voices || this.paused) return false;
    if (this.blocked) return true;
    const c = existingContext();
    return c != null && c.state !== 'running';
  }

  /** 실제로 소리가 나고 있는지 (재생 시작이 확인됨 + 오디오가 잠겨 있지 않음) */
  get isSounding(): boolean {
    return this.voices != null && !this.paused && this.confirmed && !this.playbackBlocked;
  }

  /** 사용자가 화면을 누른 순간에 다시 재생을 시도합니다 (막혔을 때) */
  retry() {
    const c = getContext();
    if (c && c.state !== 'running') void c.resume().catch(() => {});
    if (this.voices && !this.paused) this.resume(800);
  }

  private playEl(el: HTMLAudioElement) {
    return el.play().then(
      () => {
        this.blocked = false;
        this.confirmed = true;
      },
      () => {
        this.blocked = true;
        this.confirmed = false;
      },
    );
  }

  async start(key: SoundKey, fadeInMs = 1500) {
    if (!isAmbience(key)) {
      this.fadeOutAndStop(600);
      return;
    }
    await this.playTrack(AMBIENCES[key], fadeInMs);
  }

  /** 정해진 트랙을 재생합니다 (빗소리·숲 소리 공용) */
  async playTrack(track: Ambience, fadeInMs = 1500) {
    if (this.track?.key === track.key && this.voices) {
      this.resume(fadeInMs);
      return;
    }
    const gen = ++this.generation;
    this.releaseNow();
    this.paused = false;
    this.confirmed = false;
    setAmbientSession();

    const uri = await resolveUri(track.source);
    if (gen !== this.generation || !uri) return;

    const c = getContext();
    // 화면을 누르기 전에는 resume()이 끝나지 않을 수 있어 기다리지 않습니다(막힘 상태는 playbackBlocked로 알림).
    if (c && c.state === 'suspended') void c.resume().catch(() => {});
    const voices: [Voice, Voice] = [makeVoice(uri, c), makeVoice(uri, c)];
    this.track = track;
    this.voices = voices;
    this.active = 0;
    this.crossfading = false;

    const first = voices[0];
    await seek(first.el, track.loopStart);
    if (gen !== this.generation || this.paused) return;
    await this.playEl(first.el);
    this.ramp(first, 1, fadeInMs);
    this.ensureMonitor();
  }

  pause(fadeMs = 500) {
    if (this.paused) return;
    this.paused = true;
    if (!this.voices) return;
    for (const v of this.voices) {
      if (v.level > 0 || !v.el.paused) {
        this.ramp(v, 0, fadeMs, () => {
          if (this.paused) v.el.pause();
        });
      }
    }
  }

  resume(fadeInMs = 1000) {
    // 줄어들며 멈추는 중이었다면 그 멈춤을 취소 (빠르게 다시 고른 경우 소리가 끊기지 않게)
    this.generation += 1;
    const voices = this.voices;
    const track = this.track;
    if (!voices || !track) return;
    this.paused = false;
    this.crossfading = false;
    const v = voices[this.active];
    const other = voices[1 - this.active];
    this.ramp(other, 0, 1);
    other.el.pause();
    if (v.el.currentTime < track.loopStart) void seek(v.el, track.loopStart);
    void this.playEl(v.el);
    this.ramp(v, 1, fadeInMs);
    this.ensureMonitor();
  }

  fadeOutAndStop(fadeMs = 3000) {
    const voices = this.voices;
    if (!voices) return;
    const gen = ++this.generation;
    this.paused = true;
    let pending = 0;
    const finish = () => {
      pending -= 1;
      if (pending <= 0 && gen === this.generation) this.releaseNow();
    };
    for (const v of voices) {
      if (v.level > 0) {
        pending += 1;
        this.ramp(v, 0, fadeMs, finish);
      }
    }
    if (pending === 0) this.releaseNow();
  }

  async switchTo(key: SoundKey, playing: boolean) {
    if (key === this.currentKey) return;
    if (!isAmbience(key)) {
      this.fadeOutAndStop(800);
      return;
    }
    if (!playing) {
      this.releaseNow();
      return;
    }
    await this.start(key, 1500);
  }

  private releaseNow() {
    if (this.voices) {
      for (const v of this.voices) {
        if (v.doneTimer) clearTimeout(v.doneTimer);
        v.el.pause();
        try {
          v.gain?.disconnect();
        } catch {
          // 이미 연결이 끊김
        }
        v.el.removeAttribute('src');
        v.el.load();
      }
    }
    this.voices = null;
    this.track = null;
    this.crossfading = false;
    if (this.monitor) clearInterval(this.monitor);
    this.monitor = null;
  }

  /** 볼륨을 부드럽게 바꿉니다. curve가 있으면 그 모양대로. */
  private ramp(v: Voice, to: number, ms: number, onDone?: () => void, curve?: (n: number) => Float32Array<ArrayBuffer>) {
    const track = this.track;
    const gainTarget = to * (track?.gain ?? 1) * this.userVolume;
    if (v.doneTimer) clearTimeout(v.doneTimer);
    const c = existingContext();
    if (v.gain && c) {
      const now = c.currentTime;
      const g = v.gain.gain;
      const from = g.value;
      g.cancelScheduledValues(now);
      g.setValueAtTime(from, now);
      const sec = Math.max(0.01, ms / 1000);
      if (curve) {
        const shape = curve(64);
        const values = Float32Array.from(shape, (p) => from + (gainTarget - from) * p);
        g.setValueCurveAtTime(values, now, sec);
      } else {
        g.linearRampToValueAtTime(gainTarget, now + sec);
      }
    } else {
      // Web Audio가 없을 때: audio.volume으로 대신(아이폰 Safari 외 브라우저)
      const startVol = v.el.volume;
      const t0 = Date.now();
      const step = () => {
        const p = Math.min(1, (Date.now() - t0) / Math.max(1, ms));
        v.el.volume = Math.max(0, Math.min(1, startVol + (gainTarget - startVol) * p));
        if (p < 1) setTimeout(step, 50);
      };
      step();
    }
    v.level = to;
    v.doneTimer = setTimeout(() => {
      v.doneTimer = null;
      onDone?.();
    }, ms + 30);
  }

  private ensureMonitor() {
    if (this.monitor) return;
    this.monitor = setInterval(() => this.check(), 250);
  }

  private check() {
    const voices = this.voices;
    const track = this.track;
    if (!voices || !track || this.paused || this.crossfading) return;
    const cur = voices[this.active];
    if (cur.el.paused) return;
    if (cur.el.currentTime >= track.loopEnd - track.crossfade) void this.crossfadeToNext(track, voices);
  }

  private async crossfadeToNext(track: Ambience, voices: [Voice, Voice]) {
    this.crossfading = true;
    const gen = this.generation;
    const outgoing = voices[this.active];
    const nextIndex = 1 - this.active;
    const incoming = voices[nextIndex];
    await seek(incoming.el, track.loopStart);
    if (gen !== this.generation || this.paused) {
      this.crossfading = false;
      return;
    }
    this.ramp(incoming, 0, 1);
    await incoming.el.play().catch(() => {});
    this.active = nextIndex;
    const ms = track.crossfade * 1000;
    this.ramp(incoming, 1, ms, undefined, equalPowerIn);
    this.ramp(
      outgoing,
      0,
      ms,
      () => {
        outgoing.el.pause();
        this.crossfading = false;
      },
      equalPowerOut,
    );
  }
}

function makeVoice(uri: string, c: AudioContext | null): Voice {
  const el = new Audio();
  el.preload = 'auto';
  el.src = uri;
  (el as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
  let gain: GainNode | null = null;
  if (c) {
    try {
      const src = c.createMediaElementSource(el);
      gain = c.createGain();
      gain.gain.value = 0;
      src.connect(gain).connect(c.destination);
    } catch {
      gain = null;
    }
  }
  if (!gain) el.volume = 0;
  return { el, gain, level: 0, doneTimer: null };
}

async function resolveUri(source: number): Promise<string | null> {
  try {
    const asset = Asset.fromModule(source);
    return asset.uri ?? null;
  } catch {
    return null;
  }
}

function seek(el: HTMLAudioElement, seconds: number) {
  return new Promise<void>((resolve) => {
    const go = () => {
      try {
        el.currentTime = seconds;
      } catch {
        // 아직 위치를 옮길 수 없음
      }
      resolve();
    };
    if (el.readyState >= 1) go();
    else {
      const t = setTimeout(go, 4000);
      el.addEventListener(
        'loadedmetadata',
        () => {
          clearTimeout(t);
          go();
        },
        { once: true },
      );
    }
  });
}

export const ambience = new WebAmbiencePlayer();
/** 쉬는 중에 비 종류를 바꿀 때 겹쳐 넘기기 위한 두 번째 재생기 (한 번에 하나만 들림) */
export const ambienceAlt = new WebAmbiencePlayer();

/**
 * 숲 소리처럼 여러 트랙을 동시에 쓸 때 새 재생기를 만듭니다 (네이티브와 같은 이름).
 * 웹에서는 Web Audio 버퍼로 재생합니다: 아이폰 Safari에서 반복 이음새마다 오디오 요소를 새로 재생하다
 * 막혀 소리가 끊기던 문제를 없애고, 이음새를 오디오 시계에 맞춰 정확히 겹칩니다.
 */
export const AmbiencePlayer = BufferLoopPlayer;
export type AmbiencePlayer = BufferLoopPlayer;
