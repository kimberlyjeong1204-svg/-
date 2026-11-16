import { Asset } from 'expo-asset';
import { AMBIENCES, isAmbience, type Ambience, type SoundKey } from './sounds';

/**
 * 웹앱(PWA)용 환경음 재생기. 네이티브(ambiencePlayer.ts)와 같은 방식으로 동작합니다.
 *
 * - 아이폰 Safari는 audio.volume을 바꿀 수 없어서, Web Audio의 GainNode로 볼륨을 조절합니다.
 * - 끊김 없는 반복: 두 개의 audio 요소를 번갈아 쓰며 반복 구간 끝에서 몇 초 겹쳐 넘깁니다.
 * - Safari 17+에서는 오디오 종류를 'ambient'로 지정해 다른 앱 음악과 섞이고 무음 스위치를 따릅니다.
 * - 브라우저는 사용자가 화면을 누른 뒤에만 소리를 낼 수 있어, 첫 터치 때 오디오를 준비합니다.
 */

type Voice = { el: HTMLAudioElement; gain: GainNode | null; level: number; doneTimer: ReturnType<typeof setTimeout> | null };

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

function setAmbientSession() {
  try {
    const nav = navigator as AudioSessionNavigator;
    if (nav.audioSession) nav.audioSession.type = 'ambient';
  } catch {
    // 지원하지 않는 브라우저
  }
}

// 첫 터치·클릭 때 오디오를 깨워 둡니다(iOS Safari 자동 재생 제한).
if (typeof window !== 'undefined') {
  const unlock = () => {
    setAmbientSession();
    const c = getContext();
    if (c && c.state === 'suspended') void c.resume().catch(() => {});
  };
  for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, unlock, { capture: true, passive: true });
}

// 0→1로 커지는 진행 곡선. 크로스페이드 중 두 소리를 합친 크기가 일정하게 들리도록 합니다.
const equalPowerIn = (n: number) => Float32Array.from({ length: n }, (_, i) => Math.sin(((i / (n - 1)) * Math.PI) / 2));
const equalPowerOut = (n: number) => Float32Array.from({ length: n }, (_, i) => 1 - Math.cos(((i / (n - 1)) * Math.PI) / 2));

class WebAmbiencePlayer {
  private track: Ambience | null = null;
  private voices: [Voice, Voice] | null = null;
  private active = 0;
  private paused = false;
  private crossfading = false;
  private monitor: ReturnType<typeof setInterval> | null = null;
  private generation = 0;

  get currentKey(): SoundKey {
    return this.track?.key ?? 'none';
  }

  get isPlaying(): boolean {
    return this.voices != null && !this.paused;
  }

  async start(key: SoundKey, fadeInMs = 1500) {
    if (!isAmbience(key)) {
      this.fadeOutAndStop(600);
      return;
    }
    if (this.track?.key === key && this.voices) {
      this.resume(fadeInMs);
      return;
    }
    const gen = ++this.generation;
    this.releaseNow();
    this.paused = false;
    setAmbientSession();

    const track = AMBIENCES[key];
    const uri = await resolveUri(track.source);
    if (gen !== this.generation || !uri) return;

    const c = getContext();
    if (c && c.state === 'suspended') await c.resume().catch(() => {});
    const voices: [Voice, Voice] = [makeVoice(uri, c), makeVoice(uri, c)];
    this.track = track;
    this.voices = voices;
    this.active = 0;
    this.crossfading = false;

    const first = voices[0];
    await seek(first.el, track.loopStart);
    if (gen !== this.generation || this.paused) return;
    await first.el.play().catch(() => {});
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
    void v.el.play().catch(() => {});
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
    const gainTarget = to * (track?.gain ?? 1);
    if (v.doneTimer) clearTimeout(v.doneTimer);
    const c = ctx;
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
