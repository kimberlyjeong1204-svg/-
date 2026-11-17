import { Text } from 'react-native';
import { FOREST_TEXT, ForestChoiceGroup, ForestSheet } from './ui';
import { RHYTHMS, type RhythmKey } from '../../lib/breath';
import { SOUND_OPTIONS, type SoundKey } from '../../audio/sounds';

/**
 * 숲 숨 고르기 설정 (아래에서 올라오는 창)
 * 호흡 리듬·시간·숨 고르기 소리를 한곳에서 바꿉니다. 진행 중에도 바꿀 수 있습니다.
 * - 리듬: 다음 숨부터 새 리듬(전체 남은 시간은 그대로)
 * - 시간: 새 시간으로 처음부터 다시
 * - 소리: 2초 동안 부드럽게 바뀌고, 비는 항상 하나만 들림
 * 숲소리(바람·풀벌레)는 위쪽 숲소리 버튼이 따로 맡습니다.
 */

export const BREATHE_DURATIONS = [
  { value: 30, label: '30초' },
  { value: 60, label: '1분' },
  { value: 180, label: '3분' },
];

const RHYTHM_OPTIONS = (Object.keys(RHYTHMS) as RhythmKey[]).map((k) => ({
  value: k,
  label: `${RHYTHMS[k].inhaleMs / 1000}초 / ${RHYTHMS[k].exhaleMs / 1000}초`,
}));
const SOUND_CHOICES = SOUND_OPTIONS.map((o) => ({ value: o.key, label: o.label }));

type Props = {
  open: boolean;
  onClose: () => void;
  rhythm: RhythmKey;
  onRhythm: (k: RhythmKey) => void;
  duration: number;
  onDuration: (sec: number) => void;
  sound: SoundKey;
  onSound: (k: SoundKey) => void;
  /** 진행 중이면 안내 문구를 조금 다르게 */
  active: boolean;
};

export function BreatheSettingsSheet({ open, onClose, rhythm, onRhythm, duration, onDuration, sound, onSound, active }: Props) {
  return (
    <ForestSheet open={open} onClose={onClose} title="숨 고르기 설정" closeLabel="숨 고르기 설정 닫기">
      <ForestChoiceGroup label="호흡 리듬" options={RHYTHM_OPTIONS} value={rhythm} onChange={onRhythm} />
      <ForestChoiceGroup label="시간" options={BREATHE_DURATIONS} value={duration} onChange={onDuration} />
      <ForestChoiceGroup label="숨 고르기 소리" options={SOUND_CHOICES} value={sound} onChange={onSound} />
      <Text style={FOREST_TEXT.sheetNote}>
        {active ? '리듬은 바로 다음 숨부터, 시간은 새 시간으로 다시 시작해요. 닫으면 이어져요.' : '고른 값은 다음에도 그대로예요.'}
        {'\n'}숲소리(바람·풀벌레)는 위쪽 숲소리 버튼이 따로 맡아요.
      </Text>
    </ForestSheet>
  );
}
