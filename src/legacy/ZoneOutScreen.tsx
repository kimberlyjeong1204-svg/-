import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { ScreenHeader } from '../components/ScreenHeader';
import { ChipGroup, Segmented } from '../components/Segmented';
import { ForestScene } from '../components/forest/ForestScene';
import { PlayControls } from '../components/PlayControls';
import { SoundPicker } from '../components/SoundPicker';
import { useReduceMotion } from '../components/BreathCircle';
import { formatTime, useSession } from '../lib/useSession';
import { KEYS, isBoolean, isOneOf, usePersistentState } from '../lib/storage';
import { goHome } from '../lib/navigation';
import { useAmbience, useSoundChoice } from '../audio/useAmbience';
import { useForestSound, useForestSoundSettings } from '../audio/useForestSound';
import { ForestSoundButton } from '../components/forest/ForestSoundButton';
import { type } from '../theme';

const INK = '#4A4F42';
/** 숲 위에서 쓰는 글자·아이콘 색 (짙은 숲 위 9:1 이상) */
const FOREST_INK = '#EDE6D3';

type Scene = 'forest' | 'dusk';
const SCENES: { value: Scene; label: string }[] = [
  { value: 'forest', label: '숲' },
  { value: 'dusk', label: '노을' },
];

const DURATIONS = [
  { value: 30, label: '30초' },
  { value: 60, label: '1분' },
  { value: 180, label: '3분' },
];

/**
 * 보관용: 예전 「멍때리기」 화면 (숲·노을 배경)
 * 쉼표 2.0부터 /zone-out 주소는 숲 공간의 「숲에 머물기」(/forest/stay)로 연결됩니다.
 * 노을 화면(그라데이션·달·빛)의 코드는 지우지 않고 여기에 보관합니다. 지금은 어느 화면에서도 쓰지 않습니다.
 */
export function ZoneOutScreen() {
  const [durationSec, setDurationSec] = useState(180);
  const [hideTime, setHideTime] = usePersistentState<boolean>(KEYS.zoneOutHideTime, false, isBoolean);
  const [sound, setSound] = useSoundChoice();
  // 배경: 숲(기본) / 노을(기존 화면 그대로). 기기에 저장됩니다.
  const [scene, setScene] = usePersistentState<Scene>(KEYS.zoneOutScene, 'forest', isOneOf(['forest', 'dusk'] as const));
  const isForest = scene === 'forest';
  const ink = isForest ? FOREST_INK : INK;
  const reduceMotion = useReduceMotion();
  const [forestSound, setForestSound] = useForestSoundSettings();
  const session = useSession(durationSec);
  const { phase } = session;
  // 노을: 기존 소리 선택(빗소리 등) 그대로 / 숲: 귀뚜라미·풀벌레 + 바람 두 트랙
  const { yieldedToMusic: rainYielded } = useAmbience(phase, isForest ? 'none' : sound);
  const { yieldedToMusic: forestYielded } = useForestSound(phase, isForest, forestSound);

  // 시간이 다 되면 문구 없이 화면을 흐리게 하고 조용히 홈으로 돌아갑니다.
  const contentOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (phase !== 'done') return;
    Animated.timing(contentOpacity, { toValue: 0, duration: 2200, useNativeDriver: true }).start();
    const t = setTimeout(goHome, 2800);
    return () => clearTimeout(t);
  }, [phase, contentOpacity]);

  const idle = phase === 'idle';

  // 숲에서 쉬는 중에는 4초 동안 손대지 않으면 버튼과 글자가 옅어지고, 화면을 누르면 다시 보입니다.
  const uiOpacity = useRef(new Animated.Value(1)).current;
  const [wakeTick, setWakeTick] = useState(0);
  const dimUi = isForest && phase === 'running';
  useEffect(() => {
    Animated.timing(uiOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    if (!dimUi) return;
    const t = setTimeout(() => {
      Animated.timing(uiOpacity, { toValue: 0.3, duration: 1600, useNativeDriver: true }).start();
    }, 4000);
    return () => clearTimeout(t);
  }, [dimUi, wakeTick, uiOpacity]);

  return (
    <View
      style={[styles.root, isForest && styles.rootForest]}
      onStartShouldSetResponderCapture={() => {
        if (dimUi) setWakeTick((n) => n + 1);
        return false;
      }}
    >
      {isForest ? <ForestScene reduceMotion={reduceMotion} /> : <DuskSky />}
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={[styles.safe, { opacity: Animated.multiply(contentOpacity, uiOpacity) }]}>
          <ScreenHeader title="숲에 머물기" backLabel="홈으로" color={ink} right={
              isForest ? (
                <ForestSoundButton value={forestSound} onChange={setForestSound} />
              ) : (
                <SoundPicker value={sound} onChange={setSound} color={ink} />
              )
            } />

          <View style={styles.pickers}>
            <Segmented
              accessibilityLabel="시간 선택"
              options={DURATIONS}
              value={durationSec}
              disabled={!idle}
              trackColor={isForest ? 'rgba(237,230,211,0.14)' : 'rgba(255,252,246,0.45)'}
              textColor={ink}
              onChange={(v) => {
                setDurationSec(v);
                session.reset(v);
              }}
            />
            <ChipGroup accessibilityLabel="배경" options={SCENES} value={scene} disabled={!idle} onChange={setScene} tone={isForest ? 'dark' : 'light'} />
          </View>

          <View style={styles.spacer} />

          <View style={styles.bottom}>
            {rainYielded && <Text style={[styles.musicNote, { color: ink }]}>다른 앱 음악이 재생 중이라 빗소리는 꺼 두었어요.</Text>}
            {forestYielded && <Text style={[styles.musicNote, { color: ink }]}>다른 앱 음악이 재생 중이라 숲 소리는 꺼 두었어요.</Text>}
            <Pressable
              onPress={() => setHideTime(!hideTime)}
              accessibilityRole="button"
              accessibilityLabel={hideTime ? '남은 시간 보이기' : `남은 시간 ${formatTime(session.remainingSec)}, 누르면 숨기기`}
              style={styles.timeBtn}
            >
              <Text style={[styles.time, { color: ink }, hideTime && styles.timeHidden]}>{hideTime ? '· · ·' : formatTime(session.remainingSec)}</Text>
            </Pressable>
            <PlayControls
              phase={phase}
              onToggle={session.toggle}
              onStop={goHome}
              stopBackground={isForest ? 'rgba(237,230,211,0.14)' : 'rgba(255,250,242,0.6)'}
              stopColor={isForest ? FOREST_INK : undefined}
            />
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
  rootForest: { backgroundColor: '#0B1A1E' },
  pickers: { paddingHorizontal: 28, paddingTop: 12, gap: 12 },
  spacer: { flex: 1 },
  bottom: { alignItems: 'center', gap: 20, paddingBottom: 72 },
  timeBtn: { minWidth: 140, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  musicNote: { ...type.caption, color: INK, marginBottom: -8 },
  time: { ...type.timer, color: INK },
  timeHidden: { opacity: 0.45 },
});
