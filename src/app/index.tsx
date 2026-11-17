import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { HomeCover } from '../components/HomeCover';
import { shareForest } from '../lib/gift';
import { FOREST_UI } from '../components/forest/forestUi';
import { FOREST_TEXT, ForestButton } from '../components/forest/ui';
import { GearIcon } from '../components/icons';
import { HIT, fonts, radius } from '../theme';

/**
 * 홈 표지 (A1: 문 앞 몇 걸음 뒤)
 * 「방해금지」 문이 걸린 숲 입구가 표지입니다. 문틈으로 실제 숲(같은 그림)이 보입니다.
 * 「숲으로 들어가기」를 누르면 처음에는 카메라가 문 앞으로 다가가 그대로 문이 열리고,
 * 다시 올 때는 숲으로 바로 들어갑니다. 홈 → 입구 → 숲이 한 장면으로 이어집니다.
 * (만화풍 장식 없이 숲 그림만 씁니다. 크림색 홈 배경 그림 HomeBackdrop은 지우지 않고 남겨 둡니다.)
 */
export default function Home() {
  const { height } = useWindowDimensions();
  const compact = height < 700;
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gift = async () => {
    const r = await shareForest();
    const text = r === 'copied' ? '링크를 복사했어요. 보내고 싶은 곳에 붙여 넣어 주세요.' : r === 'failed' ? '링크를 만들지 못했어요. 잠시 뒤 다시 해 주세요.' : null;
    if (!text) return;
    setNote(text);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), 3500);
  };
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <HomeCover />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          {/* 숲 선물하기: 작고 은은하게 (링크만 나눔, 로그인·기록 없음) */}
          <Pressable onPress={gift} accessibilityRole="button" accessibilityLabel="숲 선물하기. 이 숲으로 오는 링크를 보내요" style={({ pressed }) => [styles.giftBtn, pressed && styles.pressed]}>
            <Text style={styles.giftText}>숲 선물하기</Text>
          </Pressable>
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
      {note && (
        <View style={styles.noteWrap} pointerEvents="none">
          <Text style={styles.note} accessibilityLiveRegion="polite">
            {note}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FOREST_UI.ground },
  safe: { flex: 1 },
  topBar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  giftBtn: { minHeight: HIT, paddingHorizontal: 10, justifyContent: 'center' },
  giftText: { ...FOREST_TEXT.caption, fontSize: 13, color: FOREST_UI.inkSoft, opacity: 0.85 },
  noteWrap: { position: 'absolute', left: 0, right: 0, top: 110, alignItems: 'center', paddingHorizontal: 24 },
  note: { ...FOREST_TEXT.caption, fontSize: 14, color: FOREST_UI.ink, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: 'rgba(10, 22, 24, 0.7)', overflow: 'hidden' },
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
