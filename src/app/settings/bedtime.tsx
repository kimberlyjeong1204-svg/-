import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Card, DayPicker, Dimmable, SectionLabel, TimeButton, ToggleRow } from '../../components/settingsParts';
import { TimePickerSheet } from '../../components/TimePickerSheet';
import { AlarmNote } from '../../components/AlarmNote';
import { useBedtimeSettings } from '../../lib/alarmSettings';
import { BEDTIME_MESSAGE, formatHM } from '../../lib/schedule';
import { colors, pretendard, radius, type } from '../../theme';

export default function BedtimeSettings() {
  const [s, setS] = useBedtimeSettings();
  const [picking, setPicking] = useState(false);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScreenHeader title="취침 알림" backLabel="알림 설정으로" fallback="/settings" />
      <ScrollView contentContainerStyle={styles.body}>
        <ToggleRow label="취침 알림 사용" value={s.enabled} onChange={(enabled) => setS({ ...s, enabled })} />
        <AlarmNote />

        <Dimmable enabled={s.enabled}>
          <Card style={styles.timeCard}>
            <TimeButton label="알림 시간" value={formatHM(s.timeMin)} onPress={() => setPicking(true)} />
          </Card>
          <View style={styles.section}>
            <SectionLabel>반복 요일</SectionLabel>
            <DayPicker value={s.days} onChange={(days) => setS({ ...s, days })} />
          </View>
        </Dimmable>

        <View style={[styles.section, styles.preview]}>
          <SectionLabel>알림 미리보기</SectionLabel>
          <View style={styles.notif} accessible accessibilityLabel={`알림 미리보기: 쉼표. ${BEDTIME_MESSAGE}`}>
            <AppGlyph />
            <View style={styles.notifText}>
              <View style={styles.notifTop}>
                <Text style={styles.notifApp}>쉼표.</Text>
                <Text style={styles.notifTime}>지금</Text>
              </View>
              <Text style={styles.notifBody}>{'오늘도 수고 많으셨어요.\n이제 휴대폰을 내려놓고 쉬어볼까요?'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <TimePickerSheet
        visible={picking}
        title="알림 시간"
        value={s.timeMin}
        minuteStep={5}
        onClose={() => setPicking(false)}
        onDone={(timeMin) => {
          setS({ ...s, timeMin });
          setPicking(false);
        }}
      />
    </SafeAreaView>
  );
}

function AppGlyph() {
  return (
    <View style={styles.glyph}>
      <Svg width={40} height={40} viewBox="0 0 100 100">
        <Path d="M0 78 C 25 66, 45 72, 62 80 C 78 88, 90 82, 100 76 L100 100 L0 100 Z" fill={colors.sageLight} />
        <Circle cx={50} cy={38} r={15} fill={colors.sageDeep} />
        <Path d="M61 47 C 63 64 54 76 39 83 C 47 73 51 63 49 52 Z" fill={colors.sageDeep} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ivory },
  body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 18 },
  section: { gap: 8 },
  timeCard: { flexDirection: 'row' },
  preview: { marginTop: 10 },
  notif: { padding: 14, borderRadius: radius.md, backgroundColor: colors.track, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  glyph: { width: 40, height: 40, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F8F5EE' },
  notifText: { flex: 1, gap: 3 },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between' },
  notifApp: { ...type.caption, ...pretendard('600'), color: colors.text },
  notifTime: { ...type.small, color: colors.textMuted },
  notifBody: { ...type.caption, fontSize: 15, lineHeight: 22, color: colors.text },
});
