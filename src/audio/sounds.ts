/**
 * 선택형 환경음 목록.
 * 음원 출처와 라이선스는 assets/sounds/CREDITS.md에 기록되어 있습니다.
 * 앱 안에서 배경음으로만 재생하며, 음원을 따로 내보내거나 내려받는 기능은 없습니다.
 */

/**
 * - none: 소리 없음
 * - rain / lightRain: 앱에 들어 있는 환경음
 * - myMusic: 내가 듣던 음악과 함께. 쉼표.는 소리를 내지 않고, 다른 앱 음악을 건드리지 않습니다.
 *   (외부 음악을 쉼표.가 직접 재생하거나 내려받지 않습니다.)
 */
export type SoundKey = 'none' | 'rain' | 'lightRain' | 'myMusic';

export const SOUND_KEYS: readonly SoundKey[] = ['none', 'rain', 'lightRain', 'myMusic'];

export type AmbienceKey = 'rain' | 'lightRain';

export function isAmbience(key: SoundKey): key is AmbienceKey {
  return key === 'rain' || key === 'lightRain';
}

/** 숲 배경에서 함께 반복 재생하는 두 트랙 */
export type ForestTrackKey = 'forestBugs' | 'forestWind';
export type TrackKey = AmbienceKey | ForestTrackKey;

export type Ambience = {
  key: TrackKey;
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
export const AMBIENCES: Record<AmbienceKey, Ambience> = {
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
  { key: 'myMusic', label: '내 음악과 함께' },
];

export function soundLabel(key: SoundKey) {
  return SOUND_OPTIONS.find((o) => o.key === key)?.label ?? '소리 없음';
}

/*
 * 숲 소리 (멍때리기 · 숲 배경 전용). 두 트랙을 동시에, 각각 따로 반복 재생합니다.
 * 측정값 (2026-11-16, 원본 Mixkit WAV 기준)
 * - Summer night crickets loop (#1789): 42.0초, -27.2 LUFS, 반복용으로 만든 음원(끝과 처음이 자연스럽게 이어짐)
 * - Wind in the forest (#1237): 25.3초, -40.0 LUFS, 새소리 없는 잔잔한 잎 바람
 * 두 파일 모두 -24 LUFS로 맞춰 변환했으므로 gain은 1이고, 화면의 음량(기본 35% / 20%)이 그대로 비율이 됩니다.
 */
export const FOREST_TRACKS: Record<ForestTrackKey, Ambience> = {
  forestBugs: {
    key: 'forestBugs',
    label: '귀뚜라미 · 풀벌레',
    source: require('../../assets/sounds/forest-crickets.m4a'),
    gain: 1,
    loopStart: 0.08,
    loopEnd: 41.9,
    crossfade: 2.5,
  },
  forestWind: {
    key: 'forestWind',
    label: '나뭇잎 사이 바람',
    source: require('../../assets/sounds/forest-wind.m4a'),
    gain: 1,
    loopStart: 0.08,
    loopEnd: 25.2,
    crossfade: 3.5,
  },
};

/** 숲 소리 기본 음량 */
export const FOREST_DEFAULT_VOLUME: Record<ForestTrackKey, number> = { forestBugs: 0.35, forestWind: 0.2 };
