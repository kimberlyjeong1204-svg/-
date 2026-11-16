import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { HIT, colors, radius, shadow, states, type } from '../theme';
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
  switch: { width: 52, height: 32, borderRadius: radius.pill, backgroundColor: '#CFC9BC', padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: colors.sageDeep },
  knob: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.18)',
  },
  knobOn: { transform: [{ translateX: 20 }] },
  // 카드: 테두리 없이 아주 약한 그림자로만 구분
  card: { borderRadius: radius.md, backgroundColor: colors.card, ...shadow.soft },
  label: { marginHorizontal: 4, ...type.sectionLabel, color: colors.textSoft },
  toggleRow: { minHeight: 60, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { ...type.bodyStrong, color: colors.text },
  days: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  day: {
    flex: 1,
    maxWidth: HIT,
    aspectRatio: 1,
    minHeight: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...states.unselected,
  },
  dayOn: { ...states.selected },
  dayText: { ...type.captionStrong, ...states.unselectedText },
  dayTextOn: { ...states.selectedText },
  timeBtn: { flex: 1, minHeight: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeLabel: { ...type.caption, fontSize: 15, color: colors.textMuted },
  timeValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeValue: { ...type.number, color: colors.text },
  dimmable: { gap: 18 },
  dimmed: { opacity: states.disabledOpacity },
});
