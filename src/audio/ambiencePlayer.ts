import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { AMBIENCES, type Ambience, type SoundKey } from './sounds';

/**
 * 환경음 재생기 (앱 전체에서 하나만 사용)
 *
 * 끊김 없는 반복: 같은 음원을 두 개의 플레이어로 엽니다. 한쪽이 반복 구간 끝에 가까워지면
 * 다른 쪽을 구간 시작부터 재생하면서 두 소리를 몇 초 동안 겹쳐 넘깁니다(크로스페이드).
 * 음원 앞뒤의 무음·페이드 구간은 재생하지 않으므로, 이어지는 부분에서 소리가 꺼지거나 튀지 않습니다.
 *
 * 볼륨 변화(페이드인·아웃, 크로스페이드)는 모두 50ms 간격으로 부드럽게 조절합니다.
 */

const TICK_MS = 50;

type Voice = {
  player: AudioPlayer;
  /** 0~1, 트랙 gain을 곱하기 전의 상대 볼륨 */
  level: number;
  tween: Tween | null;
};

type Tween = {
  from: number;
  to: number;
  startedAt: number;
  durationMs: number;
  curve: (p: number) => number;
  onDone?: () => void;
};

const linear = (p: number) => p;
/** 크로스페이드 시 합쳐진 소리 크기가 일정하게 들리도록 하는 곡선 */
const equalPowerIn = (p: number) => Math.sin((p * Math.PI) / 2);
const equalPowerOut = (p: number) => 1 - Math.cos((p * Math.PI) / 2);

class AmbiencePlayer {
  private track: Ambience | null = null;
  private voices: [Voice, Voice] | null = null;
  private active = 0;
  private crossfading = false;
  private paused = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private modeReady: Promise<void> | null = null;
  /** 시작·정지가 연달아 불릴 때 앞선 비동기 작업을 무효로 만들기 위한 번호 */
  private generation = 0;

  private ensureMode() {
    if (!this.modeReady) {
      this.modeReady = setAudioModeAsync({
        // 무음 스위치를 켜면 소리를 내지 않습니다.
        playsInSilentMode: false,
        // 사용자가 듣던 음악 등 다른 앱 소리를 멈추지 않습니다.
        interruptionMode: 'mixWithOthers',
        shouldPlayInBackground: false,
      }).catch(() => {});
    }
    return this.modeReady;
  }

  /** 지금 재생 중이거나 일시정지된 소리 */
  get currentKey(): SoundKey {
    return this.track?.key ?? 'none';
  }

  /** 휴식을 시작할 때. 소리를 고르지 않았으면 아무것도 하지 않습니다. */
  async start(key: SoundKey, fadeInMs = 1500) {
    if (key === 'none') {
      this.fadeOutAndStop(600);
      return;
    }
    if (this.track?.key === key && this.voices) {
      this.resume(fadeInMs);
      return;
    }

    const gen = ++this.generation;
    // 다른 소리가 나고 있으면 짧게 줄이며 정리합니다.
    this.releaseNow();
    await this.ensureMode();
    if (gen !== this.generation) return;

    const track = AMBIENCES[key];
    const voices: [Voice, Voice] = [
      { player: createAudioPlayer(track.source), level: 0, tween: null },
      { player: createAudioPlayer(track.source), level: 0, tween: null },
    ];
    for (const v of voices) v.player.volume = 0;

    this.track = track;
    this.voices = voices;
    this.active = 0;
    this.crossfading = false;
    this.paused = false;

    const first = voices[0];
    await waitUntilLoaded(first.player);
    if (gen !== this.generation) return;
    await safeSeek(first.player, track.loopStart);
    if (gen !== this.generation) return;
    first.player.play();
    this.tweenTo(first, 1, fadeInMs, linear);
    this.ensureTimer();
  }

  /** 휴식을 일시정지할 때: 짧게 줄인 뒤 멈춤 */
  pause(fadeMs = 500) {
    if (!this.voices || this.paused) return;
    this.paused = true;
    for (const v of this.voices) {
      if (isSounding(v)) {
        this.tweenTo(v, 0, fadeMs, linear, () => {
          if (this.paused) v.player.pause();
        });
      }
    }
  }

  /** 일시정지했던 소리를 다시 천천히 키움 */
  resume(fadeInMs = 1000) {
    if (!this.voices) return;
    this.paused = false;
    this.crossfading = false;
    const v = this.voices[this.active];
    const other = this.voices[1 - this.active];
    other.tween = null;
    other.level = 0;
    other.player.volume = 0;
    if (other.player.playing) other.player.pause();
    v.player.play();
    this.tweenTo(v, 1, fadeInMs, linear);
    this.ensureTimer();
  }

  /** 휴식이 끝났을 때: 볼륨을 천천히 줄이며 정지 */
  fadeOutAndStop(fadeMs = 3000) {
    if (!this.voices) return;
    const gen = ++this.generation;
    const voices = this.voices;
    this.paused = true;
    let pending = 0;
    const finish = () => {
      pending -= 1;
      if (pending <= 0 && gen === this.generation) this.releaseNow();
    };
    for (const v of voices) {
      if (isSounding(v)) {
        pending += 1;
        this.tweenTo(v, 0, fadeMs, linear, finish);
      }
    }
    if (pending === 0) this.releaseNow();
  }

  /** 휴식 중에 다른 소리를 고른 경우 */
  async switchTo(key: SoundKey, playing: boolean) {
    if (key === this.currentKey) return;
    if (key === 'none') {
      this.fadeOutAndStop(800);
      return;
    }
    if (!playing) {
      // 일시정지 중이면 다시 시작할 때 새 소리로 재생되도록 정리만 해 둡니다.
      this.releaseNow();
      return;
    }
    await this.start(key, 1500);
  }

  private releaseNow() {
    if (this.voices) {
      for (const v of this.voices) {
        v.tween = null;
        try {
          v.player.pause();
          v.player.remove();
        } catch {
          // 이미 정리된 플레이어
        }
      }
    }
    this.voices = null;
    this.track = null;
    this.crossfading = false;
    this.stopTimer();
  }

  private tweenTo(v: Voice, to: number, durationMs: number, curve: (p: number) => number, onDone?: () => void) {
    v.tween = { from: v.level, to, startedAt: Date.now(), durationMs: Math.max(1, durationMs), curve, onDone };
  }

  private ensureTimer() {
    if (!this.timer) this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  private stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick() {
    const voices = this.voices;
    const track = this.track;
    if (!voices || !track) {
      this.stopTimer();
      return;
    }
    const now = Date.now();

    // 1) 볼륨 변화 적용
    for (const v of voices) {
      const tw = v.tween;
      if (!tw) continue;
      const p = Math.min(1, (now - tw.startedAt) / tw.durationMs);
      v.level = tw.from + (tw.to - tw.from) * tw.curve(p);
      v.player.volume = clamp01(v.level * track.gain);
      if (p >= 1) {
        v.tween = null;
        tw.onDone?.();
        if (!this.voices) return; // onDone에서 정리됨
      }
    }

    // 2) 반복 구간 끝에 가까워지면 다음 반복과 겹쳐 넘기기
    if (this.paused || this.crossfading) return;
    const cur = voices[this.active];
    if (!cur.player.playing) return;
    if (cur.player.currentTime >= track.loopEnd - track.crossfade) {
      void this.crossfadeToNext(track);
    }
  }

  private async crossfadeToNext(track: Ambience) {
    const voices = this.voices;
    if (!voices) return;
    this.crossfading = true;
    const gen = this.generation;
    const outgoing = voices[this.active];
    const nextIndex = 1 - this.active;
    const incoming = voices[nextIndex];

    await waitUntilLoaded(incoming.player);
    if (gen !== this.generation || this.paused) {
      this.crossfading = false;
      return;
    }
    await safeSeek(incoming.player, track.loopStart);
    if (gen !== this.generation || this.paused) {
      this.crossfading = false;
      return;
    }
    incoming.level = 0;
    incoming.player.volume = 0;
    incoming.player.play();
    this.active = nextIndex;

    const ms = track.crossfade * 1000;
    const fromOut = outgoing.level;
    this.tweenTo(incoming, 1, ms, equalPowerIn);
    outgoing.tween = {
      from: fromOut,
      to: 0,
      startedAt: Date.now(),
      durationMs: ms,
      curve: equalPowerOut,
      onDone: () => {
        outgoing.player.pause();
        this.crossfading = false;
      },
    };
  }
}

/** play() 직후에는 player.playing이 바로 true가 되지 않을 수 있어 볼륨 상태로 판단합니다. */
function isSounding(v: Voice) {
  return v.level > 0 || (v.tween != null && v.tween.to > 0);
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

async function waitUntilLoaded(player: AudioPlayer, timeoutMs = 4000) {
  const start = Date.now();
  while (!player.isLoaded && Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 50));
  }
}

async function safeSeek(player: AudioPlayer, seconds: number) {
  try {
    await player.seekTo(seconds);
  } catch {
    // 위치 이동에 실패해도 처음부터 재생됩니다.
  }
}

export const ambience = new AmbiencePlayer();
