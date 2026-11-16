import { DEFAULT_BEDTIME, DEFAULT_REST, isBedtimeSettings, isRestSettings, type BedtimeSettings, type RestSettings } from './schedule';
import { KEYS, usePersistentState } from './storage';

/** 휴식 알림 설정 (기기에 저장, 기본값은 꺼짐) */
export function useRestSettings() {
  return usePersistentState<RestSettings>(KEYS.restAlarm, DEFAULT_REST, isRestSettings);
}

/** 취침 알림 설정 (기기에 저장, 기본값은 꺼짐) */
export function useBedtimeSettings() {
  return usePersistentState<BedtimeSettings>(KEYS.bedtimeAlarm, DEFAULT_BEDTIME, isBedtimeSettings);
}
