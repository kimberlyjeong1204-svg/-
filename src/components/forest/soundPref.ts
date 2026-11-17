/**
 * 숲소리 선택 기억 (기기 안에만 저장)
 * - prompted: 첫 방문 소리 안내창에서 이미 골랐는지 (다시 묻지 않음)
 * - on: 마지막으로 고른 숲소리 켜짐/꺼짐
 */
export type ForestSoundPref = { prompted: boolean; on: boolean };

export const DEFAULT_SOUND_PREF: ForestSoundPref = { prompted: false, on: false };

export function isSoundPref(v: unknown): v is ForestSoundPref {
  if (typeof v !== 'object' || v == null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.prompted === 'boolean' && typeof o.on === 'boolean';
}
