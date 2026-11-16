import { requireOptionalNativeModule, type EventSubscription } from 'expo';

type OtherAudioModule = {
  isOtherAudioPlaying(): boolean;
  addListener(event: 'onSilenceHintChange', listener: (e: { otherAudioPlaying: boolean }) => void): EventSubscription;
};

// Expo Go와 웹에는 이 모듈이 없습니다. 그때는 감지 없이 동작합니다(사용자가 고른 대로 재생).
const native = requireOptionalNativeModule<OtherAudioModule>('OtherAudio');

/** 감지 기능을 쓸 수 있는지 (개발 빌드·App Store 빌드에서 true) */
export const canDetectOtherAudio = native != null;

/** 다른 앱이 음악 등을 재생 중인지. 알 수 없으면 false */
export function isOtherAudioPlaying(): boolean {
  try {
    return native?.isOtherAudioPlaying() ?? false;
  } catch {
    return false;
  }
}

/** 쉼표.가 화면에 떠 있는 동안 다른 앱 음악이 시작되거나 멈추면 알려 줍니다. */
export function addOtherAudioListener(listener: (otherAudioPlaying: boolean) => void): { remove(): void } {
  if (!native) return { remove() {} };
  const sub = native.addListener('onSilenceHintChange', (e) => listener(e.otherAudioPlaying));
  return { remove: () => sub.remove() };
}
