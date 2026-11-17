import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBreathAnimation, useReduceMotion } from '../../components/BreathCircle';
import { FadeInText } from '../../components/FadeInText';
import { BreathRing } from '../../components/forest/BreathRing';
import { BreatheSettingsSheet } from '../../components/forest/BreatheSettingsSheet';
import { FOREST_TEXT, ForestButton } from '../../components/forest/ui';
import { useForestSpace } from '../../components/forest/ForestSpace';
import { FOREST_UI } from '../../components/forest/forestUi';
import { PauseIcon, PlayIcon } from '../../components/icons';
import { RHYTHMS, breathFrame, type RhythmKey } from '../../lib/breath';
import { formatTime, useSession } from '../../lib/useSession';
import { KEYS, isOneOf, usePersistentState } from '../../lib/storage';
import { useAmbience, useSoundChoice } from '../../audio/useAmbience';
import { HIT, type } from '../../theme';

/**
 * 숲에서 숨 고르기 (B1: 작은 빛의 고리)
 *
 * - 숲을 가리지 않도록 가이드는 지름 약 140px의 선 고리 하나. 안쪽으로 숲이 그대로 보입니다.
 * - 진행 중 4초가 지나면 조작 버튼·남은 시간만 숨고, 고리와 「들이쉬어요/내쉬어요」는 계속 보입니다.
 *   화면을 누르면 조작 버튼이 다시 나타납니다.
 * - 리듬·시간·숨 고르기 소리는 「설정」에서 언제든(진행 중에도) 바꿉니다.
 *   설정 창이 열려 있는 동안은 잠시 멈추고, 닫으면 이어집니다.
 *   · 리듬: 바로 새 들숨부터, 전체 남은 시간은 그대로
 *   · 시간: 새 시간으로 처음부터
 *   · 소리: 2초 동안 부드럽게 바뀜(비는 항상 하나). 「내 음악과 함께」면 숲소리도 잠시 쉼
 * - 끝나면 홈이 아니라 숲으로 돌아갑니다.
 */

const CUE_IN = '들이쉬어요';
const CUE_OUT = '내쉬어요';

function backToForest() {
  router.dismissTo('/forest');
}

export default function ForestBreathe() {
  const { uiOpacity, uiHidden, setAutoHide, wakeUi, setForestHold } = useForestSpace();
  const [durationSec, setDurationSec] = useState(60);
  const [rhythmKey, setRhythmKey] = usePersistentState<RhythmKey>(KEYS.breathRhythm, 'base', isOneOf(['base', 'slow'] as const));
  const [sound, setSound] = useSoundChoice();
  const rhythm = RHYTHMS[rhythmKey];
  const reduceMotion = useReduceMotion();
  const anim = useBreathAnimation(rhythm, reduceMotion);

  // 호흡 주기의 시작점(ms). 리듬을 바꾸면 그 순간부터 새 들숨이 시작되도록 옮깁니다.
  const breathStart = useRef(0);
  const [cue, setCue] = useState({ key: 'idle', text: '' });
  const cueKeyRef = useRef('idle');

  const onFrame = useCallback(
    (ms: number) => {
      const t = Math.max(0, ms - breathStart.current);
      anim.applyFrame(t);
      const f = breathFrame(t, rhythm);
      const key = `${rhythm.key}-${f.inhaling ? 'in' : 'out'}-${f.cycle}`;
      if (key !== cueKeyRef.current) {
        cueKeyRef.current = key;
        setCue({ key, text: f.inhaling ? CUE_IN : CUE_OUT });
      }
    },
    [anim, rhythm],
  );
  const session = useSession(durationSec, onFrame);
  const { phase } = session;
  const active = phase === 'running' || phase === 'paused';
  const { yieldedToMusic } = useAmbience(phase, sound);

  // 진행 중에만 조작 버튼이 자동으로 숨음
  useEffect(() => {
    setAutoHide(phase === 'running');
    return () => setAutoHide(true);
  }, [phase, setAutoHide]);

  // 「내 음악과 함께」로 쉬는 동안에는 숲소리도 잠시 쉼(켜짐 선택은 그대로)
  useEffect(() => {
    setForestHold(sound === 'myMusic' && active);
  }, [sound, active, setForestHold]);
  useEffect(() => () => setForestHold(false), [setForestHold]);

  // 리듬을 바꾸면(진행 중·일시정지 중) 그 순간부터 새 들숨
  const prevRhythm = useRef(rhythmKey);
  useEffect(() => {
    if (prevRhythm.current === rhythmKey) return;
    prevRhythm.current = rhythmKey;
    if (phase === 'running' || phase === 'paused') {
      breathStart.current = session.elapsedRef.current;
      cueKeyRef.current = '';
      onFrame(session.elapsedRef.current);
    }
  }, [rhythmKey, phase, session.elapsedRef, onFrame]);

  useEffect(() => {
    if (phase === 'idle') {
      anim.rest();
      breathStart.current = 0;
      cueKeyRef.current = 'idle';
      setCue({ key: `idle-${rhythm.key}`, text: '' });
    } else if (phase === 'done') {
      anim.fadeOut();
      const t = setTimeout(backToForest, 3200);
      return () => clearTimeout(t);
    }
  }, [phase, anim, rhythm]);

  const changeDuration = (sec: number) => {
    setDurationSec(sec);
    breathStart.current = 0;
    cueKeyRef.current = '';
    if (phase === 'idle') session.reset(sec);
    else session.changeDuration(sec);
  };

  // 설정 창: 여는 동안 잠시 멈추고, 닫으면 이어짐
  const [settingsOpen, setSettingsOpen] = useState(false);
  const resumeOnClose = useRef(false);
  const openSettings = () => {
    resumeOnClose.current = phase === 'running';
    if (phase === 'running') session.pause();
    setSettingsOpen(true);
  };
  const closeSettings = () => {
    setSettingsOpen(false);
    if (resumeOnClose.current) session.resume();
    resumeOnClose.current = false;
    wakeUi();
  };

  const done = phase === 'done';
  const idleHint = `${rhythm.inhaleMs / 1000}초 / ${rhythm.exhaleMs / 1000}초`;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.topGap} />

      <View style={styles.stage}>
        <BreathRing values={anim.values} size={140} />
        {/* 호흡 안내는 조작 버튼이 숨어도 계속 보임 */}
        <View style={styles.cueWrap} pointerEvents="none">
          {done ? (
            <FadeInText style={FOREST_TEXT.closing} duration={1600}>
              잠깐 쉬어갔어요.
            </FadeInText>
          ) : phase === 'idle' ? (
            <Text style={styles.idleCue}>{idleHint}</Text>
          ) : (
            <FadeInText key={cue.key} style={FOREST_TEXT.cue}>
              {cue.text}
            </FadeInText>
          )}
        </View>
      </View>

      {!done && (
        <Animated.View style={[styles.bottom, { opacity: uiOpacity }]} pointerEvents={uiHidden ? 'none' : 'box-none'}>
          {(yieldedToMusic || (sound === 'myMusic' && active)) && (
            <Text style={FOREST_TEXT.caption}>
              {yieldedToMusic ? '다른 앱 음악이 재생 중이라 빗소리는 꺼 두었어요.' : '내 음악과 함께하는 동안 숲소리는 잠시 쉬어요.'}
            </Text>
          )}
          <View style={styles.controls}>
            <ForestButton
              size="icon"
              variant={phase === 'idle' ? 'strong' : 'glass'}
              style={styles.play}
              onPress={session.toggle}
              accessibilityLabel={phase === 'running' ? '잠시 멈춤' : phase === 'paused' ? '다시 시작' : '숨 고르기 시작'}
              icon={phase === 'running' ? <PauseIcon size={18} color={FOREST_UI.ink} /> : <PlayIcon size={20} color={FOREST_UI.ink} />}
            />
            <Text style={[FOREST_TEXT.time, styles.time]} accessibilityLabel={`남은 시간 ${formatTime(session.remainingSec)}`}>
              {formatTime(session.remainingSec)}
            </Text>
            <ForestButton label="설정" size="sm" onPress={openSettings} accessibilityLabel="숨 고르기 설정: 호흡 리듬, 시간, 소리" />
          </View>
        </Animated.View>
      )}

      <BreatheSettingsSheet
        open={settingsOpen}
        onClose={closeSettings}
        rhythm={rhythmKey}
        onRhythm={setRhythmKey}
        duration={durationSec}
        onDuration={changeDuration}
        sound={sound}
        onSound={setSound}
        active={active}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  topGap: { height: 56 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cueWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  idleCue: { ...type.small, color: FOREST_UI.inkSoft, textAlign: 'center', ...FOREST_UI.textShadow },
  bottom: { alignItems: 'center', gap: 12, paddingBottom: 30, paddingHorizontal: 16 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  play: { width: HIT, height: HIT },
  time: { minWidth: 48 },
});
