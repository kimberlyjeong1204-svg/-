/**
 * 웹(PWA) 오디오 공용 부품: AudioContext 하나를 앱 전체가 함께 씁니다.
 * (네이티브 앱에서는 쓰지 않습니다. *.web.ts 파일에서만 불러옵니다.)
 *
 * - 아이폰 Safari는 화면을 누르는 순간에만 오디오를 깨울 수 있어서, 첫 터치 때마다 깨워 둡니다.
 *   전화·다른 앱 때문에 'interrupted'가 된 경우도 다음 터치에서 다시 깨웁니다.
 * - Safari 17+에서는 오디오 종류를 'ambient'로 지정해 다른 앱 음악과 섞이고 무음 스위치를 따릅니다.
 */

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

let ctx: AudioContext | null = null;

export function getContext(): AudioContext | null {
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

/** 이미 만들어진 AudioContext (없으면 null, 새로 만들지 않음) */
export function existingContext(): AudioContext | null {
  return ctx;
}

/**
 * 「화면을 꺼도 계속 듣기」(사용자가 켠 경우만)
 * - 오디오 종류를 'playback'으로: 다른 앱으로 가거나 화면을 잠가도 이어짐(대신 무음 스위치를 따르지 않음 — 사용자가 고른 것)
 * - 모든 소리를 한 줄(bus)로 모아 <audio> 요소로 내보냄: Safari가 이것을 미디어 재생으로 보고 백그라운드에서도 이어 주도록
 * - 잠금 화면에는 「쉼표.」 재생 정보가 보임(멈춤/재생)
 * 끄면 예전 그대로(ambient, 앱을 벗어나면 멈춤).
 */
let keep = false;
let bus: GainNode | null = null;
let streamDest: MediaStreamAudioDestinationNode | null = null;
let bridgeEl: HTMLAudioElement | null = null;
let bridged = false;
let mediaHandlers: { play?: () => void; pause?: () => void } = {};

export function keepPlaying() {
  return keep;
}

/** 모든 소리가 나가는 곳. 직접 c.destination에 잇지 말고 이것에 잇기 */
export function audioOut(c: AudioContext): AudioNode {
  if (!bus) {
    bus = c.createGain();
    bus.connect(c.destination);
  }
  return bus;
}

function startBridge() {
  const c = getContext();
  if (!c || typeof c.createMediaStreamDestination !== 'function' || typeof Audio === 'undefined') return;
  const out = audioOut(c) as GainNode;
  if (!streamDest) {
    streamDest = c.createMediaStreamDestination();
    out.connect(streamDest);
    bridgeEl = new Audio();
    bridgeEl.setAttribute('playsinline', '');
    (bridgeEl as HTMLAudioElement & { srcObject: MediaStream | null }).srcObject = streamDest.stream;
  }
  if (!bridged) {
    try {
      out.disconnect(c.destination);
    } catch {
      // 이미 끊김
    }
    bridged = true;
  }
  bridgeEl!.play().catch(() => {
    // 요소 재생이 막히면(화면을 누르기 전 등) 원래대로 스피커로 — 소리가 사라지지 않게
    if (bridged && bus) {
      bus.connect(c.destination);
      bridged = false;
    }
  });
  setMediaSession();
}

function stopBridge() {
  const c = existingContext();
  bridgeEl?.pause();
  if (bridged && bus && c) {
    bus.connect(c.destination);
    bridged = false;
  }
  try {
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
  } catch {
    // 지원 안 함
  }
}

function setMediaSession() {
  try {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: '쉼표.', artist: '나만의 숲', artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
    navigator.mediaSession.setActionHandler('pause', () => mediaHandlers.pause?.());
    navigator.mediaSession.setActionHandler('play', () => mediaHandlers.play?.());
  } catch {
    // 지원 안 함
  }
}

/** 잠금 화면의 멈춤/재생 버튼이 할 일 (숲 공간이 「소리 끄기/켜기」로 연결) */
export function setMediaHandlers(h: { play?: () => void; pause?: () => void }) {
  mediaHandlers = h;
}

/** 「화면을 꺼도 계속 듣기」 켜기/끄기 (소리가 켜져 있을 때만 켜짐으로 부름) */
export function setKeepPlaying(on: boolean) {
  if (keep === on) return;
  keep = on;
  setAmbientSession();
  if (on) startBridge();
  else stopBridge();
  for (const fn of keepListeners) fn(on);
}
const keepListeners = new Set<(on: boolean) => void>();
export function onKeepPlayingChange(fn: (on: boolean) => void) {
  keepListeners.add(fn);
  return () => keepListeners.delete(fn);
}

export function setAmbientSession() {
  try {
    const nav = navigator as AudioSessionNavigator;
    const want = keep ? 'playback' : 'ambient';
    if (nav.audioSession && nav.audioSession.type !== want) nav.audioSession.type = want;
  } catch {
    // 지원하지 않는 브라우저
  }
}

/** 오디오가 잠겨 있으면 깨우기 (화면을 누른 순간에 불러야 아이폰에서 통함) */
export function wakeContext() {
  setAmbientSession();
  const c = getContext();
  if (c && c.state !== 'running') void c.resume().catch(() => {});
  // 계속 듣기: 화면을 누를 때 내보내는 요소도 살려 둠
  if (keep && (!bridged || bridgeEl?.paused)) startBridge();
}

// 점검용: 주소에 ?audio_debug=1을 붙여 열면, 화면을 벗어났다 돌아왔을 때 그동안 소리 상태 기록을 화면 아래에 보여 줌
if (typeof window !== 'undefined') {
  const w = window as unknown as { __shimpyoAudio?: () => unknown };
  w.__shimpyoAudio = () => ({ ctx: ctx?.state ?? 'none', keep, bridged, el: bridgeEl ? { paused: bridgeEl.paused } : null, session: (navigator as AudioSessionNavigator).audioSession?.type ?? 'none' });
  if (/[?&]audio_debug=1/.test(window.location.search)) {
    const log: string[] = [];
    const stamp = () => new Date().toTimeString().slice(0, 8);
    const show = () => {
      let el = document.getElementById('shimpyo-audio-debug');
      if (!el) {
        el = document.createElement('div');
        el.id = 'shimpyo-audio-debug';
        el.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;max-height:40vh;overflow:auto;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.8);color:#fff;font:11px/1.4 -apple-system,monospace;pointer-events:none;white-space:pre-wrap';
        document.body.appendChild(el);
      }
      el.textContent = log.slice(-14).join('\n');
    };
    const note = (what: string) => {
      log.push(`${stamp()} ${what} · 오디오 ${ctx?.state ?? '없음'} · 계속듣기 ${keep ? '켬' : '끔'}${bridgeEl ? ` · 요소 ${bridgeEl.paused ? '멈춤' : '재생'}` : ''} · 시계 ${ctx ? ctx.currentTime.toFixed(0) : '-'}초`);
      show();
    };
    document.addEventListener('visibilitychange', () => note(document.hidden ? '화면 벗어남' : '돌아옴'));
    setInterval(() => note('10초마다'), 10000);
    setTimeout(() => note('시작'), 1500);
  }
}

if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, wakeContext, { capture: true, passive: true });
}

// 0→1로 커지는 / 1→0으로 줄어드는 곡선. 크로스페이드 중 두 소리를 합친 크기가 일정하게 들리도록 합니다.
export const equalPowerIn = (n: number) => Float32Array.from({ length: n }, (_, i) => Math.sin(((i / (n - 1)) * Math.PI) / 2));
export const equalPowerOut = (n: number) => Float32Array.from({ length: n }, (_, i) => Math.cos(((i / (n - 1)) * Math.PI) / 2));

// 같은 음원은 한 번만 내려받아 풀어 둡니다.
const decoded = new Map<string, Promise<AudioBuffer>>();

export function loadBuffer(uri: string): Promise<AudioBuffer> {
  let p = decoded.get(uri);
  if (!p) {
    const c = getContext();
    if (!c) return Promise.reject(new Error('Web Audio 없음'));
    p = fetch(uri)
      .then((r) => {
        if (!r.ok) throw new Error(`음원을 불러오지 못함 (${r.status})`);
        return r.arrayBuffer();
      })
      // 예전 Safari는 콜백 방식만 지원
      .then((data) => new Promise<AudioBuffer>((resolve, reject) => void c.decodeAudioData(data, resolve, reject)));
    p.catch(() => decoded.delete(uri));
    decoded.set(uri, p);
  }
  return p;
}
