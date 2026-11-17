import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { driveRain, stopRain } from './rainChannel';
import { isAmbience } from './sounds';
import type { BreatheAudio } from '../components/forest/ForestSpace';
import type { ForestWeather } from '../components/forest/forestScenes';

/**
 * 숲의 비 소리 (Rain Mode + 숲 숨 고르기 빗소리를 한 채널에서)
 *
 * - 숨 고르기 중 빗소리를 골랐으면 그 비 (일시정지면 잠시 멈춤)
 * - 숨 고르기 중 「내 음악과 함께」면 비 없음
 * - 그 밖에는 Rain Mode가 켜져 있고 숲소리가 켜져 있으면 「가벼운 비」 (4~6초 페이드)
 * - 비 종류가 바뀔 때만 2초 겹쳐 넘기고, 비는 항상 하나만 들림
 * - 다른 앱 음악이 나오거나(앱) 다른 앱으로 전환하면 잠시 멈춤
 */
export function useForestRain(weather: ForestWeather, soundOn: boolean, breathe: BreatheAudio, yielded: boolean) {
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') setAppActive(false);
      if (s === 'active') setAppActive(true);
    });
    return () => sub.remove();
  }, []);

  const breatheActive = breathe.phase === 'running' || breathe.phase === 'paused';
  useEffect(() => {
    const away = !appActive || yielded;
    if (breatheActive && isAmbience(breathe.sound)) {
      driveRain({ key: breathe.sound, playing: breathe.phase === 'running' && !away, fadeInMs: 1500, pauseMs: away && !appActive ? 0 : 500 });
      return;
    }
    if (breatheActive && breathe.sound === 'myMusic') {
      driveRain({ key: null, playing: false, fadeOutMs: 1500 });
      return;
    }
    if (weather === 'rain' && soundOn) {
      driveRain({ key: 'lightRain', playing: !away, fadeInMs: 5000, pauseMs: appActive ? 1200 : 0 });
      return;
    }
    driveRain({ key: null, playing: false, fadeOutMs: 5000 });
  }, [weather, soundOn, breatheActive, breathe.phase, breathe.sound, appActive, yielded]);

  // 숲을 떠나면 천천히 멈춤
  useEffect(() => () => stopRain(1500), []);
}
