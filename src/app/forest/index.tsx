import { Animated, StyleSheet, View } from 'react-native';
import { ForestButton } from '../../components/forest/ui';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForestSpace } from '../../components/forest/ForestSpace';
import { FOREST_UI } from '../../components/forest/forestUi';
import { BreathIcon, CupIcon } from '../../components/icons';

/**
 * 나의 숲 (숲 공간의 기본 화면)
 * 아무것도 고르지 않아도 숲이 전체 화면에 보입니다. 아래의 활동 버튼은 몇 초 뒤 사라지고, 화면을 누르면 다시 보입니다.
 */
export default function ForestHome() {
  const { uiOpacity, uiHidden } = useForestSpace();
  return (
    <SafeAreaView style={styles.root} edges={['bottom']} accessibilityLabel="나의 숲. 밤과 새벽 사이의 숲에서 작은 사람이 쉬고 있어요.">
      <View style={styles.spacer} />
      <Animated.View style={[styles.activities, { opacity: uiOpacity }]} pointerEvents={uiHidden ? 'none' : 'box-none'}>
        <ForestButton label="숨 고르기" icon={<BreathIcon size={20} color={FOREST_UI.ink} />} onPress={() => router.push('/forest/breathe')} />
        <ForestButton label="숲에 머물기" icon={<CupIcon size={20} color={FOREST_UI.ink} />} onPress={() => router.push('/forest/stay')} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  spacer: { flex: 1 },
  activities: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingBottom: 40, paddingHorizontal: 20 },
});
