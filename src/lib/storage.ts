import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * 기기 안에만 저장하는 설정값. 서버로 보내지 않습니다.
 * 읽기·쓰기에 실패해도 앱은 기본값으로 정상 동작합니다.
 */
export const KEYS = {
  sound: 'shimpyo.sound',
  breathRhythm: 'shimpyo.breathRhythm',
  zoneOutHideTime: 'shimpyo.zoneOutHideTime',
  zoneOutScene: 'shimpyo.zoneOutScene',
  forestSound: 'shimpyo.forestSound',
  forestWeather: 'shimpyo.forestWeather',
  forestSoundPref: 'shimpyo.forestSoundPref',
  forestGateSeen: 'shimpyo.forestGateSeen',
  caveFire: 'shimpyo.caveFire',
  breathDuration: 'shimpyo.breathDuration',
  restAlarm: 'shimpyo.restAlarm',
  bedtimeAlarm: 'shimpyo.bedtimeAlarm',
} as const;

export async function loadValue<T>(key: string, fallback: T, isValid: (v: unknown) => v is T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export async function saveValue<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장에 실패해도 현재 화면에서는 선택값이 그대로 유지됩니다.
  }
}

// 같은 키를 쓰는 화면끼리 값을 바로 맞추기 위한 메모리 사본
const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<(v: unknown) => void>>();

function publish(key: string, value: unknown) {
  cache.set(key, value);
  listeners.get(key)?.forEach((fn) => fn(value));
}

/**
 * 기기에 저장되는 상태. 처음에는 기본값으로 그려지고, 저장된 값을 읽으면 바뀝니다.
 * 같은 키를 쓰는 다른 화면도 함께 바뀝니다.
 */
export function usePersistentState<T>(key: string, fallback: T, isValid: (v: unknown) => v is T) {
  const [value, setValue] = useState<T>(() => (cache.has(key) ? (cache.get(key) as T) : fallback));
  // 저장된 값을 읽었는지 (처음 방문 판단처럼 기본값과 저장값을 구분해야 할 때)
  const [ready, setReady] = useState(() => cache.has(key));

  useEffect(() => {
    let alive = true;
    const fn = (v: unknown) => {
      if (alive) {
        setValue(v as T);
        setReady(true);
      }
    };
    let set = listeners.get(key);
    if (!set) listeners.set(key, (set = new Set()));
    set.add(fn);
    if (!cache.has(key)) {
      loadValue(key, fallback, isValid).then((v) => {
        if (!cache.has(key)) publish(key, v);
      });
    } else {
      fn(cache.get(key));
    }
    return () => {
      alive = false;
      set.delete(fn);
    };
    // 키마다 한 번만 읽습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T) => {
      publish(key, next);
      void saveValue(key, next);
    },
    [key],
  );

  return [value, update, ready] as const;
}

export const isOneOf =
  <T extends string>(options: readonly T[]) =>
  (v: unknown): v is T =>
    typeof v === 'string' && (options as readonly string[]).includes(v);

export const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
