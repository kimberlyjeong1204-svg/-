import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { FOREST_UI } from './forestUi';
import { colors, radius, shadow, type } from '../../theme';

/**
 * 첫 방문 소리 안내창
 * 숲에 처음 들어왔을 때 한 번만 가운데에 작게 뜹니다. 고른 뒤에는 다시 묻지 않습니다.
 * 소리를 억지로 켜지 않으며, 고른 뒤에도 위쪽 소리 버튼으로 언제든 바꿀 수 있습니다.
 * (Phase 2에서는 숲 입구의 문 앞에서 같은 창을 띄워 문 열기 흐름과 이어집니다.)
 */
export function SoundPrompt({ onChoose }: { onChoose: (soundOn: boolean) => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 700, delay: 400, useNativeDriver: true }).start();
  }, [fade]);

  return (
    <Animated.View style={[styles.backdrop, { opacity: fade }]} accessibilityViewIsModal>
      <View style={styles.card} accessibilityRole="alert">
        <Text style={styles.title} accessibilityRole="header">
          숲의 소리를 들어볼까요?
        </Text>
        <Text style={styles.body}>바람과 나뭇잎, 작은 자연의 소리가 함께해요.</Text>
        <Pressable
          onPress={() => onChoose(true)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>숲소리 켜고 들어가기</Text>
        </Pressable>
        <Pressable
          onPress={() => onChoose(false)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>조용히 들어가기</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(5, 12, 14, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    paddingTop: 28,
    paddingBottom: 14,
    paddingHorizontal: 22,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(14, 28, 31, 0.82)',
    alignItems: 'center',
    gap: 10,
    ...shadow.soft,
  },
  title: { ...type.button, fontSize: 19, color: FOREST_UI.ink, textAlign: 'center' },
  body: { ...type.small, color: FOREST_UI.inkSoft, textAlign: 'center', marginBottom: 12 },
  primary: {
    alignSelf: 'stretch',
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.sageDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { ...type.button, fontSize: 16, color: colors.white },
  secondary: { alignSelf: 'stretch', minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { ...type.small, fontSize: 15, color: FOREST_UI.ink },
  pressed: { opacity: 0.7 },
});
