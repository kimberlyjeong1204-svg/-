import type { ReactNode } from 'react';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { BreathIcon, ChevronIcon, GateIcon, MoonIcon } from '../../components/icons';
import { colors, radius, shadow, type } from '../../theme';
import { useBedtimeSettings, useRestSettings } from '../../lib/alarmSettings';
import { KEYS, isBoolean, usePersistentState } from '../../lib/storage';
import { bedtimeSummary, restSummary } from '../../lib/schedule';

export default function SettingsHub() {
  const [rest] = useRestSettings();
  const [bedtime] = useBedtimeSettings();
  const [, setGateSeen] = usePersistentState<boolean>(KEYS.forestGateSeen, false, isBoolean);
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScreenHeader title="설정" backLabel="홈으로" />
      <View style={styles.body}>
        <View style={styles.card}>
          <Row href="/settings/rest" title="휴식 알림" status={restSummary(rest)} icon={<BreathIcon size={22} color="#4F6142" />} iconBg={colors.sageMist} />
          <View style={styles.divider} />
          <Row href="/settings/bedtime" title="취침 알림" status={bedtimeSummary(bedtime)} icon={<MoonIcon color="#7A6650" />} iconBg="#EFE7DC" />
        </View>
        <Text style={styles.note}>{'알림은 소리 없이 조용히 도착해요.\n언제든 여기서 끌 수 있어요.'}</Text>

        <View style={[styles.card, styles.cardGap]}>
          <Pressable
            onPress={() => {
              // 다음 숲 입장 때 문 열기 연출을 한 번 더 보여 줌
              setGateSeen(false);
              router.push('/forest');
            }}
            accessibilityRole="button"
            accessibilityLabel="숲 입구 다시 보기, 문을 열고 숲으로 들어가요"
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.track }]}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.sageMist }]}>
              <GateIcon />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>숲 입구 다시 보기</Text>
              <Text style={styles.rowStatus}>문을 열고 숲으로 들어가요</Text>
            </View>
            <ChevronIcon />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Row({ href, title, status, icon, iconBg }: { href: Href; title: string; status: string; icon: ReactNode; iconBg: string }) {
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${status}`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.track }]}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowStatus}>{status}</Text>
      </View>
      <ChevronIcon />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ivory },
  body: { paddingHorizontal: 20, paddingTop: 24, gap: 14 },
  card: { borderRadius: radius.md, backgroundColor: colors.card, ...shadow.soft },
  row: { minHeight: 78, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.md },
  iconBox: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { ...type.bodyStrong, fontSize: 17, color: colors.text },
  rowStatus: { ...type.caption, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.line, marginLeft: 72 },
  cardGap: { marginTop: 18 },
  note: { marginHorizontal: 6, marginTop: 4, ...type.caption, color: colors.textMuted },
});
