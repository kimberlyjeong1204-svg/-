import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { HIT, colors } from '../theme';
import { DAY_LABELS, type Days } from '../lib/schedule';
import { ChevronIcon } from './icons';

/** 켜기/끄기 스위치 (iOS 스위치 모양, 진한 세이지) */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      hitSlop={8}
      style={[styles.switch, value && styles.switchOn]}
    >
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Card style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Toggle value={value} onChange={onChange} label={label} />
    </Card>
  );
}

/** 월~일 요일 선택 */
export function DayPicker({ value, onChange }: { value: Days; onChange: (d: Days) => void }) {
  return (
    <View style={styles.days} accessibilityRole="none" accessibilityLabel="반복 요일">
      {DAY_LABELS.map((label, i) => {
        const on = value[i];
        return (
          <Pressable
            key={label}
            accessibilityRole="checkbox"
            accessibilityLabel={`${label}요일`}
            accessibilityState={{ checked: on }}
            aria-checked={on}
            onPress={() => {
              const next = [...value] as Days;
              next[i] = !next[i];
              onChange(next);
            }}
            style={[styles.day, on && styles.dayOn]}
          >
            <Text style={[styles.dayText, on && styles.dayTextOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 시각 표시 버튼 (누르면 시간 선택 창) */
export function TimeButton({ label, value, onPress, style }: { label: string; value: string; onPress: () => void; style?: ViewStyle }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}, 바꾸기`}
      style={({ pressed }) => [styles.timeBtn, pressed && { backgroundColor: '#F6F2EA' }, style]}
    >
      <Text style={styles.timeLabel}>{label}</Text>
      <View style={styles.timeValueRow}>
        <Text style={styles.timeValue}>{value}</Text>
        <ChevronIcon size={16} />
      </View>
    </Pressable>
  );
}

/** 위 설정을 끈 상태에서는 흐리게 보이고 누를 수 없음 */
export function Dimmable({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return (
    <View style={[styles.dimmable, !enabled && styles.dimmed]} pointerEvents={enabled ? 'auto' : 'none'} accessibilityElementsHidden={!enabled}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  switch: { width: 52, height: 32, borderRadius: 16, backgroundColor: '#D9D4C8', padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: colors.sageDeep },
  knob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  knobOn: { transform: [{ translateX: 20 }] },
  card: { borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  label: { marginHorizontal: 4, fontSize: 13, fontWeight: '500', color: '#5C5F52' },
  toggleRow: { minHeight: 60, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 16, fontWeight: '500', color: colors.text },
  days: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  day: { flex: 1, maxWidth: HIT, aspectRatio: 1, minHeight: 36, borderRadius: 22, backgroundColor: colors.track, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: colors.sageDeep },
  dayText: { fontSize: 14, color: colors.textSoft },
  dayTextOn: { color: colors.white, fontWeight: '500' },
  timeBtn: { flex: 1, minHeight: 52, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeLabel: { fontSize: 14, color: colors.textMuted },
  timeValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeValue: { fontSize: 16, color: colors.text, fontVariant: ['tabular-nums'] },
  dimmable: { gap: 18 },
  dimmed: { opacity: 0.42 },
});
