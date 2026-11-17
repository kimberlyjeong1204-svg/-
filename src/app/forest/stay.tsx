import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForestSpace } from '../../components/forest/ForestSpace';
import { FOREST_TEXT, ForestButton, ForestChoiceGroup } from '../../components/forest/ui';
import { WindChime } from '../../components/forest/WindChime';
import { useReduceMotion } from '../../components/BreathCircle';
import { leafRustle } from '../../audio/forestTouchSound';

/**
 * 숲에 머물기 — 세 가지 체험
 *
 * 아래의 작은 선택지에서 고르거나, 고르지 않고 그냥 머물러도 됩니다. 언제든 다른 체험으로 바꿀 수 있고
 * 숲소리는 숲 공간이 맡고 있어 바꿔도 끊기지 않습니다(새로 재생하지 않음).
 * - 가만히 있기: 숲의 움직임과 자연음 그대로. 타이머·점수·완료 문구 없음
 * - 숲소리 듣기: 화면을 은은하게 어둡게. 소리가 꺼져 있거나 막혀 있으면 눌러서 켜도록 안내(자동 재생 우회 없음)
 * - 풍경 흔들기: 나뭇가지에 매달린 나무 풍경을 건드리거나 끌어 흔듦
 * 버튼과 안내는 약 5초 뒤 숨고, 화면을 누르면 다시 보입니다.
 * (예전의 선택 타이머는 화면에서 뺐습니다. 코드는 src/lib/useStayTimer.ts에 남아 있습니다.)
 */
type Mode = 'still' | 'listen' | 'chime';
const MODES: { value: Mode; label: string }[] = [
  { value: 'still', label: '가만히 있기' },
  { value: 'listen', label: '숲소리 듣기' },
  { value: 'chime', label: '풍경 흔들기' },
];
const HIDE_DELAY = 5000;

export default function ForestStay() {
  const { uiOpacity, uiHidden, wakeUi, setHideDelay, touchForest, soundOn, setSoundOn, soundStatus, retrySound } = useForestSpace();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [mode, setMode] = useState<Mode | null>(null);
  // 체험을 고르면 선택지는 접고 작은 「체험 바꾸기」만 남김
  const [menuOpen, setMenuOpen] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setHideDelay(HIDE_DELAY);
      wakeUi();
      return () => setHideDelay(4000);
    }, [setHideDelay, wakeUi]),
  );

  // 숲소리 듣기: 화면을 천천히 어둡게
  const dim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(dim, { toValue: mode === 'listen' ? 1 : 0, duration: 1800, useNativeDriver: true }).start();
  }, [mode, dim]);

  const choose = (m: Mode) => {
    setMode(m);
    setMenuOpen(false);
    wakeUi();
  };

  const audible = soundStatus === 'on';
  const blocked = soundStatus === 'blocked';
  const starting = soundStatus === 'starting';
  const turnOn = () => (blocked ? retrySound() : setSoundOn(true));

  return (
    <View style={styles.root}>
      {/* 숲 만지기는 여기서도 그대로 (풍경 흔들기 중에는 풍경 아래쪽만) */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={(e) => {
          if (mode === 'listen') return;
          touchForest(e.nativeEvent.pageX, e.nativeEvent.pageY);
          if (soundOn) leafRustle((e.nativeEvent.pageX / width) * 2 - 1);
        }}
        accessible={false}
      />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, { opacity: Animated.multiply(dim, 0.62) }]} />

      {mode === 'chime' && (
        <View style={styles.chimeWrap} pointerEvents="box-none">
          <WindChime width={Math.min(width, 520)} soundOn={soundOn && audible} reduceMotion={reduceMotion} />
          {/* 소리 상태를 정직하게: 꺼짐·재생 차단이면 소리가 나지 않는다고 알림 */}
          {(!soundOn || blocked) && (
            <Animated.Text style={[FOREST_TEXT.caption, { opacity: uiOpacity }]}>
              {blocked ? 'Safari가 소리를 멈췄어요. 위쪽 버튼을 누르면 풍경 소리도 들려요.' : '숲소리를 켜면 풍경 소리도 들려요.'}
            </Animated.Text>
          )}
        </View>
      )}

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.center} pointerEvents="box-none">
          {/* 숲소리 듣기: 소리가 꺼져 있거나 막혀 있으면 눌러서 켜기 (숨지 않음) */}
          {mode === 'listen' && !audible && (
            <View style={styles.listenCard}>
              <Text style={FOREST_TEXT.cue}>{starting ? '숲소리를 켜고 있어요.' : blocked ? 'Safari가 숲소리를 잠시 멈췄어요.' : '숲소리가 꺼져 있어요.'}</Text>
              {!starting && soundStatus !== 'held' && <ForestButton label={blocked ? '눌러서 숲소리 켜기' : '숲소리 켜기'} variant="primary" size="md" onPress={turnOn} />}
            </View>
          )}
        </View>

        <Animated.View style={[styles.bottom, { opacity: uiOpacity }]} pointerEvents={uiHidden ? 'none' : 'box-none'}>
          {mode === 'listen' && audible && (
            <View style={styles.row}>
              <ForestButton label="숲소리 끄기" size="sm" onPress={() => setSoundOn(false)} />
              <ForestButton label="돌아가기" size="sm" variant="quiet" onPress={() => { setMode(null); setMenuOpen(true); }} accessibilityLabel="숲소리 듣기 그만하기" />
            </View>
          )}
          {menuOpen || mode == null ? (
            <ForestChoiceGroup label="숲에 머물기" showLabel={false} align="center" options={MODES} value={mode} onChange={choose} />
          ) : (
            <ForestButton
              label={`${MODES.find((m) => m.value === mode)?.label} · 바꾸기`}
              size="sm"
              onPress={() => setMenuOpen(true)}
              accessibilityLabel="체험 바꾸기"
            />
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  safe: { flex: 1 },
  dim: { backgroundColor: '#03080A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  listenCard: { alignItems: 'center', gap: 14 },
  chimeWrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', gap: 6 },
  bottom: { alignItems: 'center', gap: 12, paddingBottom: 28, paddingHorizontal: 12 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
});
