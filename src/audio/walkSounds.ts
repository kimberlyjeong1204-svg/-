import type { Ambience } from './sounds';

/**
 * 숲 거닐기 장소 소리 (쉼표 숲·동굴 통합 자산 v1: 합성 프로토타입, 실제 자연 녹음 아님 → 녹음으로 교체 예정)
 * 원본 22.05kHz WAV를 아이폰 Safari용 AAC(m4a)로 변환. 반복 음원은 32초, 이음새는 2초 겹쳐 넘김.
 */
const loop = (key: string, source: number): Ambience => ({ key: key as Ambience['key'], label: key, source, gain: 1, loopStart: 0.05, loopEnd: 31.9, crossfade: 2 });

export const WALK_LOOPS = {
  waterNear: loop('waterNear', require('../../assets/sounds/walk/waterfall_near_loop.m4a')),
  waterFar: loop('waterFar', require('../../assets/sounds/walk/waterfall_far_loop.m4a')),
  leaves: loop('leaves', require('../../assets/sounds/walk/leaves_wind_loop.m4a')),
  birdsNear: loop('birdsNear', require('../../assets/sounds/walk/birds_near_loop.m4a')),
  birdsFar: loop('birdsFar', require('../../assets/sounds/walk/birds_far_loop.m4a')),
};

export const FOOTSTEPS = {
  leaves: [
    require('../../assets/sounds/walk/footstep_leaves_01.m4a'),
    require('../../assets/sounds/walk/footstep_leaves_02.m4a'),
    require('../../assets/sounds/walk/footstep_leaves_03.m4a'),
    require('../../assets/sounds/walk/footstep_leaves_04.m4a'),
  ] as number[],
  snow: [
    require('../../assets/sounds/walk/footstep_snow_01.m4a'),
    require('../../assets/sounds/walk/footstep_snow_02.m4a'),
    require('../../assets/sounds/walk/footstep_snow_03.m4a'),
    require('../../assets/sounds/walk/footstep_snow_04.m4a'),
  ] as number[],
};
