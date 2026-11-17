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

export function setAmbientSession() {
  try {
    const nav = navigator as AudioSessionNavigator;
    if (nav.audioSession && nav.audioSession.type !== 'ambient') nav.audioSession.type = 'ambient';
  } catch {
    // 지원하지 않는 브라우저
  }
}

/** 오디오가 잠겨 있으면 깨우기 (화면을 누른 순간에 불러야 아이폰에서 통함) */
export function wakeContext() {
  setAmbientSession();
  const c = getContext();
  if (c && c.state !== 'running') void c.resume().catch(() => {});
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
