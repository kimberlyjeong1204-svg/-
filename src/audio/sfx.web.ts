import { Asset } from 'expo-asset';
import { getContext, loadBuffer, setAmbientSession } from './webAudio';

/**
 * 짧은 효과음 한 번 재생 (웹). 숲 소리와 같은 오디오(Web Audio)로 내보내므로
 * 아이폰에서 따로 허락받을 필요가 없고, 숲 소리를 멈추거나 다시 시작하게 하지 않습니다.
 */
export function playOnce(source: number, volume = 1) {
  const c = getContext();
  if (!c) return;
  setAmbientSession();
  let uri: string;
  try {
    uri = Asset.fromModule(source).uri;
  } catch {
    return;
  }
  loadBuffer(uri)
    .then((buffer) => {
      const src = c.createBufferSource();
      src.buffer = buffer;
      const g = c.createGain();
      g.gain.value = Math.max(0, Math.min(1, volume));
      src.connect(g).connect(c.destination);
      src.onended = () => {
        src.disconnect();
        g.disconnect();
      };
      src.start(c.currentTime + 0.02);
      // 자동 점검용: 어떤 효과음이 났는지(화면·기능에는 영향 없음)
      const w = window as unknown as { __shimpyoSfx?: string[] };
      (w.__shimpyoSfx ??= []).push(uri);
    })
    .catch(() => {
      // 효과음이 없어도 앱은 그대로 동작
    });
}
