import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FOREST_UI } from './forestUi';
import { RHYTHMS, type RhythmKey } from '../../lib/breath';
import { SOUND_OPTIONS, type SoundKey } from '../../audio/sounds';
import { HIT, radius, shadow, states, type } from '../../theme';

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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const side = Math.max(0, (width - 520) / 2);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="숨 고르기 설정 닫기" />
      <View style={[styles.sheet, { left: side, right: side, paddingBottom: Math.max(insets.bottom, 16) + 12 }]} accessibilityViewIsModal>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            숨 고르기 설정
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.close}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </View>

        <Group label="호흡 리듬" options={RHYTHM_OPTIONS} value={rhythm} onChange={onRhythm} />
        <Group label="시간" options={BREATHE_DURATIONS} value={duration} onChange={onDuration} />
        <Group
          label="숨 고르기 소리"
          options={SOUND_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
          value={sound}
          onChange={onSound}
        />

        <Text style={styles.note}>
          {active
            ? '리듬은 바로 다음 숨부터, 시간은 새 시간으로 다시 시작해요. 닫으면 이어져요.'
            : '고른 값은 다음에도 그대로예요.'}
          {'\n'}숲소리(바람·풀벌레)는 위쪽 숲소리 버튼이 따로 맡아요.
        </Text>
      </View>
    </Modal>
  );
}

function Group<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              aria-checked={on}
              style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,12,14,0.35)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 22,
    gap: 16,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: 'rgba(16, 32, 36, 0.96)',
    ...shadow.raised,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...type.title, color: FOREST_UI.ink },
  close: { minHeight: HIT, minWidth: HIT, alignItems: 'flex-end', justifyContent: 'center' },
  closeText: { ...type.bodyStrong, color: FOREST_UI.ink },
  group: { gap: 8 },
  groupLabel: { ...type.small, color: FOREST_UI.inkSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(237,230,211,0.1)' },
  chipOn: { ...states.selected },
  chipText: { ...type.small, fontSize: 14, color: FOREST_UI.ink },
  chipTextOn: { ...states.selectedText },
  note: { ...type.caption, color: FOREST_UI.inkSoft, lineHeight: 19 },
});

