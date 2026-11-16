import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Segmented } from '../../components/Segmented';
import { Card, DayPicker, Dimmable, SectionLabel, TimeButton, ToggleRow } from '../../components/settingsParts';
import { TimePickerSheet } from '../../components/TimePickerSheet';
import { AlarmNote } from '../../components/AlarmNote';
import { BreathIcon, CheckboxIcon, DropIcon, LeafIcon, StretchIcon } from '../../components/icons';
import { useRestSettings } from '../../lib/alarmSettings';
import { REST_PROBLEM_TEXT, REST_TYPES, formatHM, planRest, type IntervalHours, type RestType } from '../../lib/schedule';
import { colors } from '../../theme';

const TYPE_ICON: Record<RestType, ReactNode> = {
  breath: <BreathIcon color="#5C6B50" />,
  water: <DropIcon color="#5C6B50" />,
  stretch: <StretchIcon color="#5C6B50" />,
  loose: <LeafIcon color="#5C6B50" />,
};

const INTERVALS: { value: IntervalHours; label: string }[] = [
  { value: 1, label: '1시간' },
  { value: 2, label: '2시간' },
  { value: 3, label: '3시간' },
];

export default function RestAlarmSettings() {
  const [s, setS] = useRestSettings();
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);
  const plan = planRest(s);

  const toggleType = (key: RestType) => {
    const types = s.types.includes(key) ? s.types.filter((t) => t !== key) : [...s.types, key];
    setS({ ...s, types });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScreenHeader title="휴식 알림" backLabel="알림 설정으로" fallback="/settings" />
      <ScrollView contentContainerStyle={styles.body}>
        <ToggleRow label="휴식 알림 사용" value={s.enabled} onChange={(enabled) => setS({ ...s, enabled })} />
        <AlarmNote />

        <Dimmable enabled={s.enabled}>
          <View style={styles.section}>
            <SectionLabel>알림 종류 (여러 개 선택 가능)</SectionLabel>
            <Card>
              {REST_TYPES.map((t, i) => {
                const on = s.types.includes(t.key);
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => toggleType(t.key)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    aria-checked={on}
                    accessibilityLabel={`${t.name}, ${t.message}`}
                    style={({ pressed }) => [styles.typeRow, i > 0 && styles.rowBorder, pressed && styles.pressed]}
                  >
                    <View style={styles.typeIcon}>{TYPE_ICON[t.key]}</View>
                    <View style={styles.typeText}>
                      <Text style={styles.typeName}>{t.name}</Text>
                      <Text style={styles.typeMsg}>{t.message}</Text>
                    </View>
                    <CheckboxIcon checked={on} />
                  </Pressable>
                );
              })}
            </Card>
          </View>

          <View style={styles.section}>
            <SectionLabel>알림 간격</SectionLabel>
            <Segmented accessibilityLabel="알림 간격" options={INTERVALS} value={s.intervalHours} onChange={(intervalHours) => setS({ ...s, intervalHours })} />
          </View>

          <View style={styles.section}>
            <SectionLabel>알림 시간대</SectionLabel>
            <Card style={styles.timeCard}>
              <TimeButton label="시작" value={formatHM(s.startMin)} onPress={() => setPicking('start')} />
              <View style={styles.vDivider} />
              <TimeButton label="종료" value={formatHM(s.endMin)} onPress={() => setPicking('end')} />
            </Card>
          </View>

          <View style={styles.section}>
            <SectionLabel>반복 요일</SectionLabel>
            <DayPicker value={s.days} onChange={(days) => setS({ ...s, days })} />
          </View>

          <Text style={[styles.summary, plan.problem && styles.problem]} accessibilityLiveRegion="polite">
            {plan.problem ? REST_PROBLEM_TEXT[plan.problem] : `하루 ${plan.perDay}번, 종류를 번갈아 한 번에 하나씩 조용히 알려드려요.`}
          </Text>
        </Dimmable>
      </ScrollView>

      <TimePickerSheet
        visible={picking != null}
        title={picking === 'end' ? '종료 시각' : '시작 시각'}
        value={picking === 'end' ? s.endMin : s.startMin}
        minuteStep={60}
        onClose={() => setPicking(null)}
        onDone={(min) => {
          setS(picking === 'end' ? { ...s, endMin: min } : { ...s, startMin: min });
          setPicking(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ivory },
  body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 18 },
  section: { gap: 8 },
  typeRow: { minHeight: 60, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#EFEAE0' },
  pressed: { backgroundColor: '#F6F2EA' },
  typeIcon: { width: 26, alignItems: 'center' },
  typeText: { flex: 1, gap: 2 },
  typeName: { fontSize: 15, fontWeight: '500', color: colors.text },
  typeMsg: { fontSize: 12.5, color: colors.textMuted },
  timeCard: { flexDirection: 'row', alignItems: 'center' },
  vDivider: { width: 1, height: 26, backgroundColor: colors.line },
  summary: { marginHorizontal: 4, fontSize: 13, lineHeight: 20, color: colors.textMuted },
  problem: { color: '#8A5A3C' },
});
