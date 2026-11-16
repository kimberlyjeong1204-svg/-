import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { ChipGroup, Segmented } from '../components/Segmented';
import { PlayControls } from '../components/PlayControls';
import { SoundPicker } from '../components/SoundPicker';
import { BreathCircle, useBreathAnimation, useReduceMotion } from '../components/BreathCircle';
import { FadeInText } from '../components/FadeInText';
import { CUE_EXHALE, CUE_INHALE, RHYTHMS, breathFrame, idleCue, type RhythmKey } from '../lib/breath';
import { formatTime, useSession } from '../lib/useSession';
import { KEYS, isOneOf, usePersistentState } from '../lib/storage';
import { goHome } from '../lib/navigation';
import { useAmbience, useSoundChoice } from '../audio/useAmbience';
import { colors, radius, shadow, type } from '../theme';

const DURATIONS = [
  { value: 30, label: '30초' },
  { value: 60, label: '1분' },
  { value: 180, label: '3분' },
];

const RHYTHM_OPTIONS = (Object.keys(RHYTHMS) as RhythmKey[]).map((k) => ({ value: k, label: RHYTHMS[k].label }));

type Cue = { key: string; text: string };

export default function Breathe() {
  const [durationSec, setDurationSec] = useState(60);
  const [rhythmKey, setRhythmKey] = usePersistentState<RhythmKey>(KEYS.breathRhythm, 'base', isOneOf(['base', 'slow'] as const));
  const [sound, setSound] = useSoundChoice();
  const rhythm = RHYTHMS[rhythmKey];
  const reduceMotion = useReduceMotion();
  const anim = useBreathAnimation(rhythm, reduceMotion);

  const [cue, setCue] = useState<Cue>({ key: 'idle', text: idleCue(rhythm) });
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
  const { yieldedToMusic } = useAmbience(phase, sound);

  useEffect(() => {
    if (phase === 'idle') {
      anim.rest();
      cueKeyRef.current = 'idle';
      setCue({ key: `idle-${rhythm.key}`, text: idleCue(rhythm) });
    } else if (phase === 'done') {
      anim.fadeOut();
    }
  }, [phase, anim, rhythm]);

  const idle = phase === 'idle';
  const done = phase === 'done';

  // 남은 공간에 맞춰 원 크기를 정합니다(작은 화면 170px ~ 기본 290px).
  const [stage, setStage] = useState({ w: 390, h: 340 });
  const circleSize = Math.round(Math.max(170, Math.min(290, stage.w - 64, stage.h - 16)));
  const cueStyle = circleSize < 240 ? styles.cueSmall : null;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScreenHeader title="숨 고르기" backLabel="홈으로" right={<SoundPicker value={sound} onChange={setSound} />} />

      <View style={styles.pickers}>
        <Segmented
          accessibilityLabel="시간 선택"
          options={DURATIONS}
          value={durationSec}
          disabled={!idle}
          onChange={(v) => {
            setDurationSec(v);
            session.reset(v);
          }}
        />
        <ChipGroup accessibilityLabel="호흡 리듬" options={RHYTHM_OPTIONS} value={rhythmKey} disabled={!idle} onChange={setRhythmKey} />
      </View>

      <View style={styles.stage} onLayout={(e) => setStage({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <BreathCircle values={anim.values} size={circleSize} />
        {!done && (
          <View style={styles.cueWrap} pointerEvents="none">
            <FadeInText key={cue.key} style={[styles.cue, cueStyle]}>
              {cue.text}
            </FadeInText>
          </View>
        )}
        {done && (
          <View style={styles.cueWrap} pointerEvents="none">
            <FadeInText style={styles.doneText} duration={1600}>
              잠깐 쉬어갔어요.
            </FadeInText>
          </View>
        )}
      </View>

      {done ? (
        <View style={styles.bottomDone}>
          <Pressable onPress={goHome} accessibilityRole="button" style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.7 }]}>
            <Text style={styles.homeLabel}>홈으로</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.bottom}>
          {yieldedToMusic && <Text style={styles.musicNote}>다른 앱 음악이 재생 중이라 빗소리는 꺼 두었어요.</Text>}
          <Text style={styles.time} accessibilityLabel={`남은 시간 ${formatTime(session.remainingSec)}`}>
            {formatTime(session.remainingSec)}
          </Text>
          <PlayControls phase={phase} onToggle={session.toggle} onStop={goHome} />
          <Text style={styles.guide}>{'원의 속도를 꼭 따라 하지 않아도 괜찮아요.\n불편하거나 어지러우면 바로 멈추세요.'}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ivory },
  pickers: { paddingHorizontal: 28, paddingTop: 12, gap: 14 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 190 },
  cueWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  // 원이 가장 작을 때도 안에 들어가도록 폭을 제한하고, 굵기를 살짝 올려 읽기 쉽게 합니다.
  cue: { maxWidth: 210, textAlign: 'center', ...type.cue, color: colors.text },
  cueSmall: { maxWidth: 170, ...type.cueSmall },
  doneText: { ...type.closing, color: colors.text },
  bottom: { alignItems: 'center', gap: 20, paddingBottom: 16 },
  musicNote: { ...type.caption, color: colors.textMuted, marginBottom: -8 },
  time: { ...type.timer, color: colors.text },
  guide: { marginTop: 6, paddingHorizontal: 28, textAlign: 'center', ...type.caption, color: colors.textMuted },
  bottomDone: { alignItems: 'center', paddingBottom: 48 },
  homeBtn: { minHeight: 48, paddingHorizontal: 26, borderRadius: radius.pill, backgroundColor: colors.secondary, justifyContent: 'center', ...shadow.soft },
  homeLabel: { ...type.button, color: colors.text },
});
