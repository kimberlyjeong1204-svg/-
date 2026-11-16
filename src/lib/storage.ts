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

/**
 * 기기에 저장되는 상태. 처음에는 기본값으로 그려지고, 저장된 값을 읽으면 바뀝니다.
 */
export function usePersistentState<T>(key: string, fallback: T, isValid: (v: unknown) => v is T) {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    let alive = true;
    loadValue(key, fallback, isValid).then((v) => {
      if (alive) setValue(v);
    });
    return () => {
      alive = false;
    };
    // 처음 한 번만 읽습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      void saveValue(key, next);
    },
    [key],
  );

  return [value, update] as const;
}

export const isOneOf =
  <T extends string>(options: readonly T[]) =>
  (v: unknown): v is T =>
    typeof v === 'string' && (options as readonly string[]).includes(v);

export const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
