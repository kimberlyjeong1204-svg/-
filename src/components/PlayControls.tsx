import { Pressable, StyleSheet, View } from 'react-native';
import { PauseIcon, PlayIcon, StopIcon } from './icons';
import { HIT, colors } from '../theme';
import type { SessionPhase } from '../lib/useSession';

type Props = {
  phase: SessionPhase;
  onToggle: () => void;
  /** 그만하기: 확인 없이 바로 끝냅니다. */
  onStop: () => void;
  stopBackground?: string;
};

export function PlayControls({ phase, onToggle, onStop, stopBackground = colors.beige }: Props) {
  const running = phase === 'running';
  const showStop = phase === 'running' || phase === 'paused';
  return (
    <View style={styles.row}>
      {showStop && <View style={styles.spacer} />}
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={running ? '잠시 멈춤' : '시작'}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        {running ? <PauseIcon /> : <PlayIcon />}
      </Pressable>
      {showStop && (
        <Pressable
          onPress={onStop}
          accessibilityRole="button"
          accessibilityLabel="그만하기"
          style={({ pressed }) => [styles.stop, { backgroundColor: stopBackground }, pressed && styles.pressed]}
        >
          <StopIcon />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  spacer: { width: HIT, height: HIT },
  main: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.sageDeep,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.sageDeep,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  stop: { width: HIT, height: HIT, borderRadius: HIT / 2, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
});
