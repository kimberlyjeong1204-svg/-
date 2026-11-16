import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeBackdrop } from '../components/HomeBackdrop';
import { GearIcon } from '../components/icons';
import { HIT, colors, fonts, radius, shadow, type } from '../theme';

/**
 * 홈: 쉼표. / 나만의 숲 / 숲으로 들어가기
 * 숲이 앱의 중심이라 큰 버튼은 하나만 둡니다. 숨 고르기·숲에 머물기는 숲 안의 활동으로 바로 가는 작은 링크입니다.
 */
export default function Home() {
  // 높이가 낮은 휴대폰(아이폰 SE 등)에서는 제목·버튼을 위로 당깁니다.
  const { height } = useWindowDimensions();
  const compact = height < 700;
  return (
    <View style={styles.root}>
      <HomeBackdrop />
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
          <Text style={styles.brand}>나만의 숲</Text>
        </View>

        <View style={[styles.actions, compact && styles.actionsCompact]}>
          <Pressable
            onPress={() => router.push('/forest')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
          >
            <Text style={styles.primaryLabel}>숲으로 들어가기</Text>
          </Pressable>
          <View style={styles.links}>
            <Pressable onPress={() => router.push('/forest/breathe')} accessibilityRole="link" style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
              <Text style={styles.linkLabel}>숨 고르기</Text>
            </Pressable>
            <Text style={styles.dot} importantForAccessibility="no" accessibilityElementsHidden>
              ·
            </Text>
            <Pressable onPress={() => router.push('/forest/stay')} accessibilityRole="link" style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
              <Text style={styles.linkLabel}>숲에 머물기</Text>
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
  titleBlock: { marginTop: '24%', alignItems: 'center', gap: 14 },
  titleBlockCompact: { marginTop: 24, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 60, lineHeight: 70, color: colors.text, letterSpacing: -1 },
  titleCompact: { fontSize: 50, lineHeight: 60 },
  brand: { fontFamily: fonts.displayRegular, fontSize: 18, lineHeight: 26, color: colors.textSoft, letterSpacing: 2, opacity: 0.8 },
  actions: { marginTop: 64, paddingHorizontal: 44, gap: 18, alignItems: 'stretch' },
  actionsCompact: { marginTop: 40 },
  // 메인 버튼: 테두리 없이 짙은 세이지
  primary: { height: 62, borderRadius: radius.pill, backgroundColor: colors.sageDeep, alignItems: 'center', justifyContent: 'center', ...shadow.primary },
  primaryPressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  primaryLabel: { ...type.button, color: colors.white },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  link: { minHeight: HIT, paddingHorizontal: 12, justifyContent: 'center' },
  linkLabel: { ...type.button, fontSize: 16, color: colors.textSoft },
  dot: { ...type.button, fontSize: 16, color: colors.textSoft, opacity: 0.4 },
});
