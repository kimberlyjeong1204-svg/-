import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ForestGate } from '../components/forest/ForestGate';
import { FOREST_UI } from '../components/forest/forestUi';
import { FOREST_TEXT, ForestButton } from '../components/forest/ui';
import { useReduceMotion } from '../components/BreathCircle';
import { GearIcon } from '../components/icons';
import { HIT, fonts, radius } from '../theme';

const FOREST_BG = require('../../assets/forest/forest-bg.webp');

/**
 * 홈 표지 (A1: 문 앞 몇 걸음 뒤)
 * 「방해금지」 문이 걸린 숲 입구가 표지입니다. 문틈으로 실제 숲(같은 그림)이 보입니다.
 * 「숲으로 들어가기」를 누르면 처음에는 카메라가 문 앞으로 다가가 그대로 문이 열리고,
 * 다시 올 때는 숲으로 바로 들어갑니다. 홈 → 입구 → 숲이 한 장면으로 이어집니다.
 * (만화풍 장식 없이 숲 그림만 씁니다. 크림색 홈 배경 그림 HomeBackdrop은 지우지 않고 남겨 둡니다.)
 */
export default function Home() {
  const { width, height } = useWindowDimensions();
  const compact = height < 700;
  const reduceMotion = useReduceMotion();
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* 문 너머: 숲 공간과 같은 숲 그림 */}
      <Image source={FOREST_BG} style={{ position: 'absolute', left: 0, top: 0, width, height }} resizeMode="cover" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      <ForestGate cover reduceMotion={reduceMotion} />
      {/* 글자가 잘 읽히도록 위·아래만 살짝 어둡게 */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#060E10" stopOpacity={0.78} />
            <Stop offset="0.36" stopColor="#060E10" stopOpacity={0.22} />
            <Stop offset="0.62" stopColor="#060E10" stopOpacity={0.08} />
            <Stop offset="1" stopColor="#060E10" stopOpacity={0.62} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#shade)" />
      </Svg>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="설정" style={({ pressed }) => [styles.gear, pressed && styles.pressed]}>
            <GearIcon color={FOREST_UI.ink} />
          </Pressable>
        </View>

        <View style={[styles.titleBlock, compact && styles.titleBlockCompact]}>
          <Text style={[styles.title, compact && styles.titleCompact]} accessibilityRole="header">
            쉼표.
          </Text>
          <Text style={styles.brand}>나만의 숲</Text>
        </View>

        <View style={styles.spacer} />

        <View style={[styles.actions, compact && styles.actionsCompact]}>
          <ForestButton label="숲으로 들어가기" variant="primary" size="lg" onPress={() => router.push('/forest')} />
          <View style={styles.links}>
            <Pressable onPress={() => router.push('/forest/breathe?start=1')} accessibilityRole="link" style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
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
  root: { flex: 1, backgroundColor: FOREST_UI.ground },
  safe: { flex: 1 },
  topBar: { height: 56, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 20 },
  gear: { width: HIT, height: HIT, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.5 },
  titleBlock: { marginTop: '10%', alignItems: 'center', gap: 10 },
  titleBlockCompact: { marginTop: 4, gap: 6 },
  title: { fontFamily: fonts.display, fontSize: 56, lineHeight: 66, color: FOREST_UI.ink, letterSpacing: -1, ...FOREST_UI.textShadow },
  titleCompact: { fontSize: 46, lineHeight: 56 },
  brand: { fontFamily: fonts.displayRegular, fontSize: 17, lineHeight: 24, color: FOREST_UI.inkSoft, letterSpacing: 2, ...FOREST_UI.textShadow },
  spacer: { flex: 1 },
  actions: { paddingHorizontal: 36, paddingBottom: 34, gap: 14 },
  actionsCompact: { paddingBottom: 20 },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  link: { minHeight: HIT, paddingHorizontal: 12, justifyContent: 'center' },
  linkLabel: { ...FOREST_TEXT.caption, fontSize: 15, color: FOREST_UI.ink },
  dot: { ...FOREST_TEXT.caption, fontSize: 15, opacity: 0.5 },
});
