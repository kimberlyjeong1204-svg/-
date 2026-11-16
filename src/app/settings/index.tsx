import type { ReactNode } from 'react';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { BreathIcon, ChevronIcon, MoonIcon } from '../../components/icons';
import { colors } from '../../theme';

export default function SettingsHub() {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScreenHeader title="알림 설정" backLabel="홈으로" />
      <View style={styles.body}>
        <View style={styles.card}>
          <Row href="/settings/rest" title="휴식 알림" status="꺼짐" icon={<BreathIcon size={22} color="#4F6142" />} iconBg={colors.sageMist} />
          <View style={styles.divider} />
          <Row href="/settings/bedtime" title="취침 알림" status="꺼짐" icon={<MoonIcon color="#7A6650" />} iconBg="#EFE7DC" />
        </View>
        <Text style={styles.note}>{'알림은 소리 없이 조용히 도착해요.\n언제든 여기서 끌 수 있어요.'}</Text>
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
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#F6F2EA' }]}
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
  card: { borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { minHeight: 76, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 16, fontWeight: '500', color: colors.text },
  rowStatus: { fontSize: 13, color: colors.textMuted },
  divider: { height: 1, backgroundColor: '#EFEAE0', marginLeft: 72 },
  note: { marginHorizontal: 6, marginTop: 4, fontSize: 13, lineHeight: 21, color: colors.textMuted },
});
