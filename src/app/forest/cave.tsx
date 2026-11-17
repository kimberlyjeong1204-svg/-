import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CaveScene } from '../../components/cave/CaveScene';
import { LetGoPaper } from '../../components/cave/LetGoPaper';
import { PebbleThrow } from '../../components/cave/PebbleThrow';
import { fireOnScreen } from '../../components/cave/caveConfig';
import { useForestSpace } from '../../components/forest/ForestSpace';
import { ForestButton } from '../../components/forest/ui';
import { useReduceMotion } from '../../components/BreathCircle';
import { startCaveFire, stopCaveFire } from '../../audio/caveSound';
import { radius, type } from '../../theme';
import { FOREST_UI } from '../../components/forest/forestUi';

/**
 * 동굴 — 마음이 복잡할 때 들어와 내려놓는 곳 (쉼표 2.0 핵심 공간)
 *
 * - 아무것도 하지 않고 장작불 곁에 머물러도 되고(기본), 「내 마음 버리기」 「조약돌 던지기」를 고를 수 있음
 * - 들어오면 숲소리는 천천히 작아지고 장작불 소리가 커짐(숲 공간 레이아웃이 맞춤). 나가면 반대로
 * - 들어온 지 약 15분 뒤 한 번만 「나가기 / 더 머물기」. 카운트다운·반복 알림·성취 문구 없음
 * - 버튼과 문구는 최소, 4초 뒤 숨고 화면을 누르면 다시 보임
 * 지금 바위 그림은 임시입니다(assets/cave/README.md). 최종 동굴 그림을 받기 전에는 완료 처리하지 않습니다.
 */

const DEFAULT_PROMPT_MS = 15 * 60 * 1000;

type Activity = 'stay' | 'letgo' | 'pebble';

export default function Cave() {
  const { soundOn, forestHold, uiOpacity, uiHidden, setAutoHide, wakeUi } = useForestSpace();
  const reduceMotion = useReduceMotion();
  const [activity, setActivity] = useState<Activity>('stay');
  const [flare, setFlare] = useState(0);
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const [fire, setFire] = useState({ x: 0, y: 0 });

  // 장작불 소리: 숲소리를 켠 경우에만
  const fireOn = soundOn && !forestHold;
  useEffect(() => {
    if (fireOn) startCaveFire(3000);
    else stopCaveFire(1500);
  }, [fireOn]);
  useEffect(() => () => stopCaveFire(2500), []);

  // 글을 쓰는 동안에는 버튼이 숨지 않음
  useEffect(() => {
    setAutoHide(activity !== 'letgo');
    return () => setAutoHide(true);
  }, [activity, setAutoHide]);

  // 약 15분 뒤 한 번만 안내 (점검용으로 시간을 줄일 수 있음)
  const [ask, setAsk] = useState<'no' | 'pending' | 'show' | 'done'>('no');
  useEffect(() => {
    const ms = (globalThis as { __SHIMPYO_CAVE_PROMPT_MS?: number }).__SHIMPYO_CAVE_PROMPT_MS ?? DEFAULT_PROMPT_MS;
    const t = setTimeout(() => setAsk((a) => (a === 'no' ? 'pending' : a)), ms);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    // 글을 쓰는 중이면 끝난 뒤에 보여 줌
    if (ask === 'pending' && activity !== 'letgo') setAsk('show');
  }, [ask, activity]);

  const measure = () => {
    rootRef.current?.measureInWindow((x, y, w, h) => {
      const f = fireOnScreen(w, h);
      setFire({ x: x + f.x, y: y + f.y });
    });
  };

  const leave = () => router.dismissTo('/forest');

  return (
    <View ref={rootRef} style={styles.root} onLayout={measure} accessibilityLabel="동굴. 장작불이 조용히 타고 있어요.">
      <CaveScene reduceMotion={reduceMotion} flare={flare} />

      {activity === 'pebble' && <PebbleThrow soundOn={fireOn} reduceMotion={reduceMotion} />}

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.topGap} />
        {activity === 'letgo' ? (
          <KeyboardAvoidingView style={styles.center} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <LetGoPaper
              fire={fire}
              soundOn={fireOn}
              onBurn={() => setFlare((n) => n + 1)}
              onClose={() => {
                setActivity('stay');
                wakeUi();
              }}
            />
          </KeyboardAvoidingView>
        ) : (
          <View style={styles.spacer} pointerEvents="none" />
        )}

        {activity !== 'letgo' && (
          <Animated.View style={[styles.bottom, { opacity: uiOpacity }]} pointerEvents={uiHidden ? 'none' : 'box-none'}>
            {activity === 'stay' ? (
              <View style={styles.row}>
                <ForestButton label="내 마음 버리기" onPress={() => setActivity('letgo')} />
                <ForestButton label="조약돌 던지기" onPress={() => setActivity('pebble')} />
              </View>
            ) : (
              <ForestButton label="그만 던지기" variant="quiet" size="sm" onPress={() => setActivity('stay')} />
            )}
          </Animated.View>
        )}
      </SafeAreaView>

      {ask === 'show' && (
        <View style={styles.askWrap} pointerEvents="box-none">
          <View style={styles.askCard} accessibilityRole="alert">
            <Text style={styles.askText}>더 머물러도 괜찮아요.</Text>
            <View style={styles.row}>
              <ForestButton label="나가기" size="sm" onPress={leave} />
              <ForestButton label="더 머물기" variant="primary" size="sm" onPress={() => setAsk('done')} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#07090a' },
  safe: { flex: 1 },
  topGap: { height: 56 },
  spacer: { flex: 1 },
  center: { flex: 1, justifyContent: 'center' },
  bottom: { alignItems: 'center', paddingBottom: 30, paddingHorizontal: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  askWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  askCard: { width: '100%', maxWidth: 320, padding: 22, gap: 16, borderRadius: radius.lg, backgroundColor: 'rgba(14, 18, 20, 0.86)', alignItems: 'center' },
  askText: { ...type.body, color: FOREST_UI.ink, textAlign: 'center' },
});

