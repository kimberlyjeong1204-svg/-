import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { PlayControls } from '../components/PlayControls';
import { SoundPicker } from '../components/SoundPicker';
import { useReduceMotion } from '../components/BreathCircle';
import { formatTime, useSession } from '../lib/useSession';
import { KEYS, isBoolean, usePersistentState } from '../lib/storage';
import { goHome } from '../lib/navigation';
import { useAmbience, useSoundChoice } from '../audio/useAmbience';
import { type } from '../theme';

const INK = '#4A4F42';

const DURATIONS = [
  { value: 30, label: '30초' },
  { value: 60, label: '1분' },
  { value: 180, label: '3분' },
];

export default function ZoneOut() {
  const [durationSec, setDurationSec] = useState(180);
  const [hideTime, setHideTime] = usePersistentState<boolean>(KEYS.zoneOutHideTime, false, isBoolean);
  const [sound, setSound] = useSoundChoice();
  const session = useSession(durationSec);
  const { phase } = session;
  const { yieldedToMusic } = useAmbience(phase, sound);

  // 시간이 다 되면 문구 없이 화면을 흐리게 하고 조용히 홈으로 돌아갑니다.
  const contentOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (phase !== 'done') return;
    Animated.timing(contentOpacity, { toValue: 0, duration: 2200, useNativeDriver: true }).start();
    const t = setTimeout(goHome, 2800);
    return () => clearTimeout(t);
  }, [phase, contentOpacity]);

  const idle = phase === 'idle';

  return (
    <View style={styles.root}>
      <DuskSky />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={[styles.safe, { opacity: contentOpacity }]}>
          <ScreenHeader title="멍때리기" backLabel="홈으로" color={INK} right={<SoundPicker value={sound} onChange={setSound} color={INK} />} />

          <View style={styles.pickers}>
            <Segmented
              accessibilityLabel="시간 선택"
              options={DURATIONS}
              value={durationSec}
              disabled={!idle}
              trackColor="rgba(255,252,246,0.45)"
              textColor={INK}
              onChange={(v) => {
                setDurationSec(v);
                session.reset(v);
              }}
            />
          </View>

          <View style={styles.spacer} />

          <View style={styles.bottom}>
            {yieldedToMusic && <Text style={styles.musicNote}>다른 앱 음악이 재생 중이라 빗소리는 꺼 두었어요.</Text>}
            <Pressable
              onPress={() => setHideTime(!hideTime)}
              accessibilityRole="button"
              accessibilityLabel={hideTime ? '남은 시간 보이기' : `남은 시간 ${formatTime(session.remainingSec)}, 누르면 숨기기`}
              style={styles.timeBtn}
            >
              <Text style={[styles.time, hideTime && styles.timeHidden]}>{hideTime ? '· · ·' : formatTime(session.remainingSec)}</Text>
            </Pressable>
            <PlayControls phase={phase} onToggle={session.toggle} onStop={goHome} stopBackground="rgba(255,250,242,0.6)" />
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

/** 아주 천천히 색이 옮겨 가는 노을 하늘, 달, 옅은 구름 */
function DuskSky() {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const drift = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const slow = (v: Animated.Value, ms: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
    const a = slow(drift, 40000);
    const b = slow(float, 60000);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [reduceMotion, drift, float]);

  const skyHeight = height * 1.6;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: skyHeight,
          transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, height - skyHeight] }) }],
        }}
      >
        <LinearGradient
          colors={['#DEDBD2', '#E6DDD2', '#EBD8C8', '#EDCDB8', '#E9C4AE']}
          locations={[0, 0.3, 0.58, 0.8, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Svg width={40} height={40} viewBox="0 0 40 40" style={{ position: 'absolute', top: height * 0.27, right: 70, opacity: 0.85 }}>
        <Path d="M24 6 A14.6 14.6 0 1 0 34 24 A11 11 0 0 1 24 6 Z" fill="#FBF3E6" />
      </Svg>

      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: height * 0.55,
          transform: [{ translateX: float.interpolate({ inputRange: [0, 1], outputRange: [-12, 16] }) }],
        }}
      >
        <Svg width={width} height={280}>
          <Defs>
            <RadialGradient id="cloud" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FCEEE0" stopOpacity={0.7} />
              <Stop offset="1" stopColor="#FCEEE0" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={width * 0.28} cy={75} rx={190} ry={50} fill="url(#cloud)" />
          <Ellipse cx={width * 0.82} cy={150} rx={200} ry={55} fill="url(#cloud)" />
          <Ellipse cx={width * 0.45} cy={220} rx={170} ry={45} fill="url(#cloud)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E6DDD2' },
  safe: { flex: 1 },
  pickers: { paddingHorizontal: 28, paddingTop: 12 },
  spacer: { flex: 1 },
  bottom: { alignItems: 'center', gap: 20, paddingBottom: 72 },
  timeBtn: { minWidth: 140, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  musicNote: { ...type.caption, color: INK, marginBottom: -8 },
  time: { ...type.timer, color: INK },
  timeHidden: { opacity: 0.45 },
});
