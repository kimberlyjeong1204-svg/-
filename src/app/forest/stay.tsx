import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForestSpace } from '../../components/forest/ForestSpace';
import { FOREST_UI } from '../../components/forest/forestUi';
import { FadeInText } from '../../components/FadeInText';
import { FOREST_TEXT, ForestButton, ForestChoiceGroup } from '../../components/forest/ui';
import { PauseIcon, PlayIcon } from '../../components/icons';
import { useStayTimer } from '../../lib/useStayTimer';
import { formatTime } from '../../lib/useSession';
import { HIT, type } from '../../theme';

/**
 * 숲에 머물기
 * 기본은 시간 제한 없이 숲에 머무는 것입니다. 타이머는 선택(30초·1분·3분)이고 쉬는 중에도 바꿀 수 있습니다.
 * 시간이 다 되면 알람 없이 짧은 문구만 보이고, 숲으로 돌아갑니다. 숲소리와 날씨는 그대로 이어집니다.
 */
const OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: '없음' },
  { value: 30, label: '30초' },
  { value: 60, label: '1분' },
  { value: 180, label: '3분' },
];

export default function ForestStay() {
  const { uiOpacity, uiHidden } = useForestSpace();
  const timer = useStayTimer();
  // 남은 시간은 기본으로 숨김. 누르면 보이고, 다시 누르면 숨김
  const [timeHidden, setTimeHidden] = useState(true);

  const resetRef = useRef(timer.reset);
  resetRef.current = timer.reset;
  useEffect(() => {
    if (timer.state !== 'done') return;
    const t = setTimeout(() => {
      resetRef.current();
      router.dismissTo('/forest');
    }, 3600);
    return () => clearTimeout(t);
  }, [timer.state]);

  const active = timer.state === 'running' || timer.state === 'paused';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.topGap} />
      <View style={styles.spacer}>
        {timer.state === 'done' && (
          <FadeInText style={FOREST_TEXT.closing} duration={1600}>
            잠깐 머물렀어요.
          </FadeInText>
        )}
      </View>

      {timer.state !== 'done' && (
        <Animated.View style={[styles.bottom, { opacity: uiOpacity }]} pointerEvents={uiHidden ? 'none' : 'box-none'}>
          {active && (
            <View style={styles.timeRow}>
              <Pressable
                onPress={() => setTimeHidden(!timeHidden)}
                accessibilityRole="button"
                accessibilityLabel={timeHidden ? '남은 시간 보이기' : `남은 시간 ${formatTime(timer.remainingSec)}, 누르면 숨기기`}
                style={styles.timeBtn}
              >
                <Text style={styles.time}>{timeHidden ? '· · ·' : formatTime(timer.remainingSec)}</Text>
              </Pressable>
              <ForestButton
                size="icon"
                onPress={timer.state === 'running' ? timer.pause : timer.resume}
                accessibilityLabel={timer.state === 'running' ? '타이머 잠시 멈춤' : '타이머 다시 시작'}
                icon={timer.state === 'running' ? <PauseIcon size={16} color={FOREST_UI.ink} /> : <PlayIcon size={16} color={FOREST_UI.ink} />}
              />
            </View>
          )}
          <ForestChoiceGroup
            label="타이머"
            align="center"
            options={OPTIONS.map((o) => ({ value: o.value ?? 0, label: o.label }))}
            value={timer.seconds ?? 0}
            onChange={(v) => timer.choose(v === 0 ? null : v)}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  topGap: { height: 56 },
  spacer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { alignItems: 'center', gap: 12, paddingBottom: 36, paddingHorizontal: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeBtn: { minWidth: 110, minHeight: HIT, alignItems: 'center', justifyContent: 'center' },
  time: { ...type.timer, fontSize: 24, color: FOREST_UI.inkSoft, ...FOREST_UI.textShadow },
});
