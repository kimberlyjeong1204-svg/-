/**
 * 나무 풍경 효과음 10개 (쉼표 나무 풍경 자산 v1, 패키지 제작 중 새로 합성한 원본 음원. design/windchime/README.md)
 * 원본 WAV를 아이폰 Safari에서도 풀 수 있는 AAC(m4a)로 바꿔 넣었습니다.
 */
export const WINDCHIME_TAPS: number[] = [
  require('../../assets/sounds/windchime/wood_tap_01.m4a'),
  require('../../assets/sounds/windchime/wood_tap_02.m4a'),
  require('../../assets/sounds/windchime/wood_tap_03.m4a'),
  require('../../assets/sounds/windchime/wood_tap_04.m4a'),
  require('../../assets/sounds/windchime/wood_tap_05.m4a'),
  require('../../assets/sounds/windchime/wood_tap_06.m4a'),
  require('../../assets/sounds/windchime/wood_tap_07.m4a'),
  require('../../assets/sounds/windchime/wood_tap_08.m4a'),
  require('../../assets/sounds/windchime/wood_tap_09.m4a'),
  require('../../assets/sounds/windchime/wood_tap_10.m4a'),
];

/** 동시에 울리는 소리 수 제한 (빠르게 흔들어도 소리가 쌓이지 않게) */
export const MAX_VOICES = 4;
