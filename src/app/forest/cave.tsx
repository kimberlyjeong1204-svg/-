import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CaveScene } from '../../components/cave/CaveScene';
import { FireCloseup } from '../../components/cave/FireCloseup';
import { LetGoPaper } from '../../components/cave/LetGoPaper';
import { PebbleThrow } from '../../components/cave/PebbleThrow';
import { fireOnScreen } from '../../components/cave/caveConfig';
import { useForestSpace } from '../../components/forest/ForestSpace';
import { ForestButton } from '../../components/forest/ui';
import { useReduceMotion } from '../../components/BreathCircle';
import { logDrop, startCaveFire, stopCaveFire } from '../../audio/caveSound';
import { goHome } from '../../lib/navigation';
import { radius, type } from '../../theme';
import { FOREST_UI } from '../../components/forest/forestUi';

/**
 * 동굴 — 마음이 복잡할 때 들어와 내려놓는 곳 (쉼표 2.0 핵심 공간)
 *
 * - 아무것도 하지 않고 장작불 곁에 머물러도 되고(기본), 「내 마음 버리기」 「조약돌 던지기」를 고를 수 있음
 * - 들어오면 숲소리는 천천히 작아지고 장작불 소리가 커짐(숲 공간 레이아웃이 맞춤). 나가면 반대로
 * - 들어온 지 약 15분 뒤 한 번만 「나가기 / 더 머물기」. 카운트다운·반복 알림·성취 문구 없음
 * - 버튼과 문구는 최소, 4초 뒤 숨고 화면을 누르면 다시 보임
 * - 장작불은 코드로 그린 살아 있는 불(fireRenderer). 불을 누르거나 「불 가까이 보기」 → 불멍 화면(겹쳐 나타나기, 줌·흐림·검은 화면 없음)
 *   불멍: 「장작 더 넣기」(한 번에 하나, 1.6초 간격) · 「동굴 전체 보기」. 시간 제한·점수·완료 문구 없음
 * - 「나가기」: 숲으로 돌아가기 / 홈으로 돌아가기. 위쪽 뒤로 가기는 불멍이면 동굴 전체로, 아니면 숲으로
 */

const DEFAULT_PROMPT_MS = 15 * 60 * 1000;

type Activity = 'stay' | 'letgo' | 'pebble';

export default function Cave() {
  const { soundOn, forestHold, uiOpacity, uiHidden, setAutoHide, wakeUi, setLeaveGuard } = useForestSpace();
  const reduceMotion = useReduceMotion();
  const [activity, setActivity] = useState<Activity>('stay');
  const [flare, setFlare] = useState(0);
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const [fire, setFire] = useState({ x: 0, y: 0 });
  const [fireLocal, setFireLocal] = useState({ x: -999, y: -999 });

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

  // 불 가까이 보기(불멍): 동굴 위에 천천히 겹쳐 나타남
  const [close, setClose] = useState(false);
  const [closeShown, setCloseShown] = useState(false);
  const closeFade = useRef(new Animated.Value(0)).current;
  const native = Platform.OS !== 'web';
  const openClose = () => {
    setActivity('stay');
    setClose(true);
    setCloseShown(false);
    Animated.timing(closeFade, { toValue: 1, duration: reduceMotion ? 300 : 900, easing: Easing.inOut(Easing.quad), useNativeDriver: native }).start(({ finished }) => finished && setCloseShown(true));
    wakeUi();
  };
  const closeClose = useCallback(() => {
    setCloseShown(false);
    Animated.timing(closeFade, { toValue: 0, duration: reduceMotion ? 300 : 900, easing: Easing.inOut(Easing.quad), useNativeDriver: native }).start(({ finished }) => finished && setClose(false));
    wakeUi();
  }, [closeFade, native, reduceMotion, wakeUi]);
  // 장작 더 넣기: 한 번에 하나(날아가는 동안·직후에는 버튼이 쉼)
  const [logs, setLogs] = useState(0);
  const [logBusy, setLogBusy] = useState(false);
  const addLog = () => {
    if (logBusy) return;
    setLogBusy(true);
    setLogs((n) => n + 1);
    setTimeout(() => setLogBusy(false), 1600);
    wakeUi();
  };
  const onLogLand = () => {
    if (fireOn) logDrop();
  };

  // 나가기 고르기
  const [exitOpen, setExitOpen] = useState(false);
  // 위쪽 뒤로 가기: 불멍이면 동굴 전체로, 나가기 창이 열려 있으면 닫기
  const closeRef = useRef({ close, exitOpen, closeClose });
  closeRef.current = { close, exitOpen, closeClose };
  useFocusEffect(
    useCallback(() => {
      setLeaveGuard(() => {
        const st = closeRef.current;
        if (st.exitOpen) {
          setExitOpen(false);
          return false;
        }
        if (st.close) {
          st.closeClose();
          return false;
        }
        return true;
      });
      return () => setLeaveGuard(null);
    }, [setLeaveGuard]),
  );

  const measure = () => {
    rootRef.current?.measureInWindow((x, y, w, h) => {
      const f = fireOnScreen(w, h);
      setFire({ x: x + f.x, y: y + f.y });
      setFireLocal(f);
    });
  };

  const leave = () => router.dismissTo('/forest');

  return (
    <View ref={rootRef} style={styles.root} onLayout={measure} accessibilityLabel="동굴. 장작불이 조용히 타고 있어요.">
      <CaveScene reduceMotion={reduceMotion} flare={flare} paused={closeShown} />

      {/* 장작불을 누르면 불 가까이 보기 */}
      {activity === 'stay' && !close && (
        <Pressable
          onPress={openClose}
          accessibilityRole="button"
          accessibilityLabel="장작불. 누르면 불을 가까이 봐요"
          style={[styles.fireSpot, { left: fireLocal.x - 60, top: fireLocal.y - 95 }]}
        />
      )}

      {activity === 'pebble' && <PebbleThrow soundOn={fireOn} reduceMotion={reduceMotion} />}

      {close && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: closeFade }]} pointerEvents="none" accessibilityLabel="장작불 가까이. 불꽃이 조용히 타고 있어요.">
          <FireCloseup reduceMotion={reduceMotion} addLog={logs} onLand={onLogLand} />
        </Animated.View>
      )}

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
            {close ? (
              <View style={styles.row}>
                <ForestButton label="장작 더 넣기" size="sm" variant="solid" onPress={addLog} disabled={logBusy} />
                <ForestButton label="동굴 전체 보기" size="sm" variant="solid" onPress={closeClose} />
              </View>
            ) : activity === 'stay' ? (
              <View style={styles.row}>
                <ForestButton label="불 가까이 보기" size="sm" variant="solid" onPress={openClose} />
                <ForestButton label="내 마음 버리기" size="sm" variant="solid" onPress={() => setActivity('letgo')} />
                <ForestButton label="조약돌 던지기" size="sm" variant="solid" onPress={() => setActivity('pebble')} />
                <ForestButton label="나가기" size="sm" variant="quiet" onPress={() => setExitOpen(true)} />
              </View>
            ) : (
              <ForestButton label="그만 던지기" variant="quiet" size="sm" onPress={() => setActivity('stay')} />
            )}
          </Animated.View>
        )}
      </SafeAreaView>

      {exitOpen && (
        <View style={styles.askWrap} pointerEvents="box-none">
          <View style={styles.askCard} accessibilityRole="alert">
            <Text style={styles.askText}>어디로 갈까요?</Text>
            <View style={styles.col}>
              <ForestButton label="숲으로 돌아가기" variant="solid" size="sm" onPress={leave} />
              <ForestButton label="홈으로 돌아가기" variant="solid" size="sm" onPress={goHome} />
              <ForestButton label="더 머물기" variant="quiet" size="sm" onPress={() => setExitOpen(false)} />
            </View>
          </View>
        </View>
      )}

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
  col: { alignSelf: 'stretch', gap: 10 },
  fireSpot: { position: 'absolute', width: 120, height: 130, borderRadius: 60 },
  askWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  askCard: { width: '100%', maxWidth: 320, padding: 22, gap: 16, borderRadius: radius.lg, backgroundColor: 'rgba(14, 18, 20, 0.86)', alignItems: 'center' },
  askText: { ...type.body, color: FOREST_UI.ink, textAlign: 'center' },
});

