/**
 * 선택형 환경음 목록.
 * 음원 출처와 라이선스는 assets/sounds/CREDITS.md에 기록되어 있습니다.
 * 앱 안에서 배경음으로만 재생하며, 음원을 따로 내보내거나 내려받는 기능은 없습니다.
 */

export type SoundKey = 'none' | 'rain' | 'lightRain';

export const SOUND_KEYS: readonly SoundKey[] = ['none', 'rain', 'lightRain'];

export type Ambience = {
  key: Exclude<SoundKey, 'none'>;
  label: string;
  // require()로 불러온 앱 내장 음원
  source: number;
  /** 재생 볼륨(0~1). 두 음원의 체감 크기를 맞추기 위한 값 */
  gain: number;
  /** 반복 구간 시작(초). 음원 앞의 무음·페이드인을 건너뜁니다. */
  loopStart: number;
  /** 반복 구간 끝(초). 음원 끝의 페이드아웃·무음 전에 다음 반복으로 넘어갑니다. */
  loopEnd: number;
  /** 다음 반복과 겹쳐 넘기는 시간(초) */
  crossfade: number;
};

/*
 * 측정값 (2026-11-16)
 * - Long rain ambience: 335.2초, 통합 음량 -28.2 LUFS, 앞 약 3초 페이드인 / 뒤 약 3초 페이드아웃
 * - Light rain looping: 96.0초, 통합 음량 -32.4 LUFS, 앞뒤 페이드 없음(이음새 자연스러움)
 * 체감 크기를 맞추려고 Long rain을 약 4.2dB 낮춥니다. (0.8 × 10^(-4.2/20) ≈ 0.49)
 */
export const AMBIENCES: Record<Ambience['key'], Ambience> = {
  rain: {
    key: 'rain',
    label: '잔잔한 비',
    source: require('../../assets/sounds/long-rain.mp3'),
    gain: 0.49,
    loopStart: 3.5,
    loopEnd: 331.0,
    crossfade: 4,
  },
  lightRain: {
    key: 'lightRain',
    label: '가벼운 비',
    source: require('../../assets/sounds/light-rain.m4a'),
    gain: 0.8,
    loopStart: 0.15,
    loopEnd: 95.7,
    crossfade: 2.5,
  },
};

export const SOUND_OPTIONS: { key: SoundKey; label: string }[] = [
  { key: 'none', label: '소리 없음' },
  { key: 'rain', label: AMBIENCES.rain.label },
  { key: 'lightRain', label: AMBIENCES.lightRain.label },
];

export function soundLabel(key: SoundKey) {
  return SOUND_OPTIONS.find((o) => o.key === key)?.label ?? '소리 없음';
}
