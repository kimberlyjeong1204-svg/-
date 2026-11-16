import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipGroup, Segmented } from '../../components/Segmented';
import { PlayControls } from '../../components/PlayControls';
import { BreathCircle, useBreathAnimation, useReduceMotion } from '../../components/BreathCircle';
import { FadeInText } from '../../components/FadeInText';
import { useForestSpace } from '../../components/forest/ForestSpace';
import { FOREST_UI } from '../../components/forest/forestUi';
import { CUE_EXHALE, CUE_INHALE, RHYTHMS, breathFrame, idleCue, type RhythmKey } from '../../lib/breath';
import { formatTime, useSession } from '../../lib/useSession';
import { KEYS, isOneOf, usePersistentState } from '../../lib/storage';
import { type } from '../../theme';

/**
 * 숲에서 숨 고르기
 * 숲 풍경 위에 반투명 호흡 가이드를 띄웁니다. 리듬(3초/5초, 4초/6초)과 호흡 원은 기존 숨 고르기와 같습니다.
 * 끝나면 홈이 아니라 숲으로 돌아갑니다. 숲 소리는 숲 공간이 맡고 있어 끊기지 않습니다.
 */
const DURATIONS = [
  { value: 30, label: '30초' },
  { value: 60, label: '1분' },
  { value: 180, label: '3분' },
];
const RHYTHM_OPTIONS = (Object.keys(RHYTHMS) as RhythmKey[]).map((k) => ({ value: k, label: RHYTHMS[k].label }));

// 숲 안에서 왔든 홈에서 바로 왔든, 끝나면 숲 전체 화면으로
function backToForest() {
  router.dismissTo('/forest');
}

export default function ForestBreathe() {
  const { uiOpacity, uiHidden, setAutoHide } = useForestSpace();
  const [durationSec, setDurationSec] = useState(60);
  const [rhythmKey, setRhythmKey] = usePersistentState<RhythmKey>(KEYS.breathRhythm, 'base', isOneOf(['base', 'slow'] as const));
  const rhythm = RHYTHMS[rhythmKey];
  const reduceMotion = useReduceMotion();
  const anim = useBreathAnimation(rhythm, reduceMotion);
  const [cue, setCue] = useState({ key: 'idle', text: idleCue(rhythm) });
  const cueKeyRef = useRef('idle');

  const onFrame = useCallback(
    (ms: number) => {
      anim.applyFrame(ms);
      const f = breathFrame(ms, rhythm);
      const key = `${f.inhaling ? 'in' : 'out'}-${f.cycle}`;
      if (key !== cueKeyRef.current) {
        cueKeyRef.current = key;
        setCue({ key, text: f.inhaling ? CUE_INHALE : CUE_EXHALE });
      }
    },
    [anim, rhythm],
  );
  const session = useSession(durationSec, onFrame);
  const { phase } = session;

  // 시작 전에는 버튼을 계속 보이고, 숨 고르는 동안에는 자동으로 옅어지게
  useEffect(() => {
    setAutoHide(phase === 'running');
    return () => setAutoHide(true);
  }, [phase, setAutoHide]);

  useEffect(() => {
    if (phase === 'idle') {
      anim.rest();
      cueKeyRef.current = 'idle';
      setCue({ key: `idle-${rhythm.key}`, text: idleCue(rhythm) });
    } else if (phase === 'done') {
      anim.fadeOut();
      const t = setTimeout(backToForest, 3200);
      return () => clearTimeout(t);
    }
  }, [phase, anim, rhythm]);

  const idle = phase === 'idle';
  const done = phase === 'done';
  const [stage, setStage] = useState({ w: 390, h: 360 });
  const size = Math.round(Math.max(170, Math.min(270, stage.w - 80, stage.h - 20)));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.topGap} />
      <Animated.View style={[styles.pickers, { opacity: uiOpacity }]} pointerEvents={uiHidden ? 'none' : 'box-none'}>
        <Segmented
          accessibilityLabel="시간 선택"
          options={DURATIONS}
          value={durationSec}
          disabled={!idle}
          trackColor={FOREST_UI.glass}
          textColor={FOREST_UI.ink}
          onChange={(v) => {
            setDurationSec(v);
            session.reset(v);
          }}
        />
        <ChipGroup accessibilityLabel="호흡 리듬" options={RHYTHM_OPTIONS} value={rhythmKey} disabled={!idle} onChange={setRhythmKey} tone="dark" />
      </Animated.View>

      <View style={styles.stage} onLayout={(e) => setStage({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {/* 숲이 비쳐 보이도록 반투명 */}
        <View style={styles.circleGlass}>
          <BreathCircle values={anim.values} size={size} />
        </View>
        <View style={styles.cueWrap} pointerEvents="none">
          {done ? (
            <FadeInText style={styles.doneText} duration={1600}>
              잠깐 쉬어갔어요.
            </FadeInText>
          ) : (
            <FadeInText key={cue.key} style={[styles.cue, size < 230 && styles.cueSmall]}>
              {cue.text}
            </FadeInText>
          )}
        </View>
      </View>

      {!done && (
        <Animated.View style={[styles.bottom, { opacity: uiOpacity }]} pointerEvents={uiHidden ? 'none' : 'box-none'}>
          <Text style={styles.time}>{formatTime(session.remainingSec)}</Text>
          <PlayControls phase={phase} onToggle={session.toggle} onStop={backToForest} stopBackground={FOREST_UI.glass} stopColor={FOREST_UI.ink} />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  topGap: { height: 56 },
  pickers: { paddingHorizontal: 28, paddingTop: 8, gap: 12 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  circleGlass: { opacity: 0.55 },
  cueWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  cue: { maxWidth: 220, textAlign: 'center', ...type.cue, color: FOREST_UI.ink, ...FOREST_UI.textShadow },
  cueSmall: { maxWidth: 170, ...type.cueSmall },
  doneText: { ...type.closing, color: FOREST_UI.ink, ...FOREST_UI.textShadow },
  bottom: { alignItems: 'center', gap: 18, paddingBottom: 28 },
  time: { ...type.timer, fontSize: 26, color: FOREST_UI.inkSoft, ...FOREST_UI.textShadow },
});
