import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForestSpace } from '../../components/forest/ForestSpace';
import { FOREST_UI } from '../../components/forest/forestUi';
import { BreathIcon, CupIcon } from '../../components/icons';
import { HIT, radius, type } from '../../theme';

/**
 * 숲에 머물기 (숲 공간의 기본 화면)
 * 아무것도 고르지 않아도 숲이 전체 화면에 보입니다. 아래의 활동 버튼은 몇 초 뒤 사라지고, 화면을 누르면 다시 보입니다.
 */
export default function ForestHome() {
  const { uiOpacity, uiHidden } = useForestSpace();
  return (
    <SafeAreaView style={styles.root} edges={['bottom']} accessibilityLabel="나의 숲. 밤과 새벽 사이의 숲에서 작은 사람이 쉬고 있어요.">
      <View style={styles.spacer} />
      <Animated.View style={[styles.activities, { opacity: uiOpacity }]} pointerEvents={uiHidden ? 'none' : 'box-none'}>
        <Pressable
          onPress={() => router.push('/forest/breathe')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
        >
          <BreathIcon size={20} color={FOREST_UI.ink} />
          <Text style={styles.pillText}>숨 고르기</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/forest/stay')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
        >
          <CupIcon size={20} color={FOREST_UI.ink} />
          <Text style={styles.pillText}>멍때리기</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  spacer: { flex: 1 },
  activities: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingBottom: 40, paddingHorizontal: 20 },
  pill: {
    minHeight: HIT + 4,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: FOREST_UI.glass,
  },
  pillText: { ...type.button, fontSize: 16, color: FOREST_UI.ink },
  pressed: { opacity: 0.6 },
});
