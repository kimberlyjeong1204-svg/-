import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeBackdrop } from '../components/HomeBackdrop';
import { BreathIcon, CupIcon, GearIcon } from '../components/icons';
import { HIT, colors, fonts, radius, shadow, type } from '../theme';

export default function Home() {
  // 높이가 낮은 휴대폰(아이폰 SE 등)에서는 제목·버튼을 위로 당겨 아래 그림과 겹치지 않게 합니다.
  const { height } = useWindowDimensions();
  const compact = height < 700;
  return (
    <View style={styles.root}>
      <HomeBackdrop compact={compact} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="알림 설정" style={({ pressed }) => [styles.gear, pressed && styles.pressed]}>
            <GearIcon />
          </Pressable>
        </View>

        <View style={[styles.titleBlock, compact && styles.titleBlockCompact]}>
          <Text style={[styles.title, compact && styles.titleCompact]} accessibilityRole="header">
            쉼표.
          </Text>
          <Text style={styles.slogan}>{'몰입하는 일상에,\n잠깐의 여유.'}</Text>
        </View>

        <View style={[styles.buttons, compact && styles.buttonsCompact]}>
          <Pressable onPress={() => router.push('/forest')} accessibilityRole="button" style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}>
            <Text style={[styles.btnLabel, { color: colors.white }]}>나의 숲으로</Text>
          </Pressable>
          {/* 기존 활동은 작은 보조 버튼으로 유지 (숲 안에서 고르는 구조가 자리 잡으면 다시 검토) */}
          <View style={styles.subRow}>
            <Pressable onPress={() => router.push('/breathe')} accessibilityRole="button" style={({ pressed }) => [styles.btn, styles.btnSecondary, styles.btnSmall, pressed && styles.btnPressed]}>
              <BreathIcon />
              <Text style={[styles.btnLabel, styles.btnLabelSmall]}>숨 고르기</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/zone-out')} accessibilityRole="button" style={({ pressed }) => [styles.btn, styles.btnSecondary, styles.btnSmall, pressed && styles.btnPressed]}>
              <CupIcon />
              <Text style={[styles.btnLabel, styles.btnLabelSmall]}>멍때리기</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ivory },
  safe: { flex: 1 },
  topBar: { height: 56, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 20 },
  gear: { width: HIT, height: HIT, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.5 },
  titleBlock: { marginTop: '18%', alignItems: 'center', gap: 22 },
  titleBlockCompact: { marginTop: 8, gap: 14 },
  titleCompact: { fontSize: 50, lineHeight: 60 },
  buttonsCompact: { marginTop: 32 },
  title: { fontFamily: fonts.display, fontSize: 60, lineHeight: 70, color: colors.text, letterSpacing: -1 },
  slogan: { fontFamily: fonts.displayRegular, fontSize: 18, lineHeight: 30, color: colors.textSoft, textAlign: 'center' },
  buttons: { marginTop: 56, paddingHorizontal: 44, gap: 16 },
  btn: {
    height: 62,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  // 메인 버튼: 테두리 없이 짙은 세이지
  btnPrimary: { backgroundColor: colors.sageDeep, ...shadow.primary },
  // 보조 버튼: 테두리 대신 아주 약한 그림자
  btnSecondary: { backgroundColor: colors.secondary, ...shadow.soft },
  btnPressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  btnLabel: { ...type.button, color: colors.text },
  subRow: { flexDirection: 'row', gap: 12 },
  btnSmall: { flex: 1, height: 52 },
  btnLabelSmall: { fontSize: 16 },
});
