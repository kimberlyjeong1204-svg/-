/**
 * 음악 목록 (Pixabay Content License — 앱 안에서 무료 사용 가능, 출처 표기 의무 없음. 기록은 assets/sounds/CREDITS.md)
 * 받은 mp3를 m4a(AAC 128kbps)로 바꿔 가볍게 넣음. 곡은 끝에서 처음으로 반복.
 */
export type MusicKey = 'jazzPiano' | 'jazzTrio' | 'flute' | 'vocal';

export const MUSIC: Record<MusicKey, { label: string; title: string; source: number; gain: number }> = {
  jazzPiano: { label: '피아노 재즈', title: 'Draw me a night', source: require('../../assets/sounds/music/jazz-piano-draw-me-a-night.m4a'), gain: 0.55 },
  jazzTrio: { label: '재즈 트리오', title: 'Background Jazz', source: require('../../assets/sounds/music/jazz-trio-background-jazz.m4a'), gain: 0.5 },
  flute: { label: '피리 명상', title: 'Drift', source: require('../../assets/sounds/music/meditation-flute-drift.m4a'), gain: 0.55 },
  vocal: { label: '보컬 명상', title: 'OM SHANTI', source: require('../../assets/sounds/music/meditation-vocal-om-shanti.m4a'), gain: 0.5 },
};
