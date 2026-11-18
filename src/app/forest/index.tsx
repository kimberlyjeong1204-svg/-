import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForestSpace } from '../../components/forest/ForestSpace';
import { FOREST_UI } from '../../components/forest/forestUi';
import { FOREST_TEXT, ForestButton } from '../../components/forest/ui';
import { StayTimerMenu } from '../../components/forest/StayTimer';
import { RestScene } from '../../components/forest/RestScene';
import { ForestChoiceGroup } from '../../components/forest/ui';
import type { RestSound } from '../../components/forest/ForestSpace';
import { useReduceMotion } from '../../components/BreathCircle';
import { startNature, stopNature } from '../../audio/restSound';
import { playMusic, stopMusic } from '../../audio/musicPlayer';
import { CAVE_SPOT, forestToScreen } from '../../components/forest/forestConfig';
import { leafRustle } from '../../audio/forestTouchSound';
import { radius } from '../../theme';

/**
 * 나의 숲 (숲 공간의 첫 화면)
 *
 * - 들어오면 아래에 「숨 고르기 · 숲에 머물기 · 동굴 가기」가 작게 보였다가 약 6초 뒤 사라짐.
 *   화면을 누르거나 아래의 작은 메뉴 버튼(···)을 누르면 다시 보임. 상시 메뉴·큰 아이콘 없음
 * - 숲을 직접 만질 수 있음: 누른 자리의 잎이 흔들리고, 근처 반딧불이가 밝아지며 다가옴(소리를 켰으면 잎 스치는 소리)
 * - 동굴은 메뉴만이 아니라 숲 속 장소: 오른쪽 깊은 숲길 끝에 장작불 빛이 옅게 새어 나오는 곳을 누르면
 *   그 빛 쪽으로 어두워지며 동굴로 들어감
 */
const HIDE_DELAY = 6500;

export default function ForestHome() {
  const { uiOpacity, uiHidden, wakeUi, setHideDelay, touchForest, soundOn, weather, restSound, setRestSound, setLeaveGuard } = useForestSpace();
  const reduceMotion = useReduceMotion();

  // 돗자리 펴고 눕기: 시간 설정 없이 바로. 소리는 기존 설정을 따름(켜져 있으면 자연음, 꺼져 있으면 조용히)
  const [resting, setResting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [restPick, setRestPick] = useState<RestSound>('nature');
  const applyRestSound = (pick: RestSound, on: boolean) => {
    if (!on) {
      stopNature(800);
      stopMusic(800);
      return;
    }
    if (pick === 'nature') {
      stopMusic(2500);
      startNature(2500);
    } else {
      stopNature(2500);
      playMusic(pick, 3000);
    }
  };
  const lieDown = () => {
    setResting(true);
    setLeaving(false);
    setRestPick('nature');
    setRestSound('nature');
    applyRestSound('nature', soundOn);
  };
  // 누른 순간에 재생(아이폰 허락), 아이는 그대로 누워 있고 타이머도 그대로
  const pickSound = (p: RestSound) => {
    setRestPick(p);
    setRestSound(p);
    applyRestSound(p, soundOn);
    wakeUi();
  };
  const getUp = () => setLeaving(true);
  const onLeft = useCallback(() => {
    setResting(false);
    setLeaving(false);
    setRestSound(null);
    stopNature(1500);
    stopMusic(1500);
  }, [setRestSound]);
  // 소리를 켜고 끄면 고른 소리도 따라감
  useEffect(() => {
    if (resting && !leaving) applyRestSound(restPick, soundOn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundOn]);
  // 숲을 떠나면 정리
  useEffect(
    () => () => {
      setRestSound(null);
      stopNature(1200);
      stopMusic(1200);
    },
    [setRestSound],
  );
  // 누워 있을 때 위쪽 뒤로 가기: 먼저 일어남
  const restingRef = useRef(false);
  restingRef.current = resting && !leaving;
  useFocusEffect(
    useCallback(() => {
      setLeaveGuard(() => {
        if (restingRef.current) {
          setLeaving(true);
          return false;
        }
        return true;
      });
      return () => setLeaveGuard(null);
    }, [setLeaveGuard]),
  );
  void restSound;
  const { width, height } = useWindowDimensions();
  const native = Platform.OS !== 'web';

  useFocusEffect(
    useCallback(() => {
      setHideDelay(HIDE_DELAY);
      wakeUi();
      return () => setHideDelay(4000);
    }, [setHideDelay, wakeUi]),
  );

  // 동굴로: 장작불 빛 쪽으로 어둠이 번진 뒤 들어감
  const iris = useRef(new Animated.Value(0)).current;
  const [entering, setEntering] = useState(false);
  const cave = forestToScreen(CAVE_SPOT.u, CAVE_SPOT.v, width, height);
  const enterCave = () => {
    if (entering) return;
    setEntering(true);
    Animated.timing(iris, { toValue: 1, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: native }).start(() => {
      router.push('/forest/cave');
    });
  };
  // 동굴에서 돌아오면 어둠을 걷음
  useFocusEffect(
    useCallback(() => {
      if (!entering) return;
      Animated.timing(iris, { toValue: 0, duration: 700, useNativeDriver: native }).start(() => setEntering(false));
    }, [entering, iris, native]),
  );
  const reach = Math.hypot(Math.max(cave.x, width - cave.x), Math.max(cave.y, height - cave.y)) * 2.2;

  const touch = (x: number, y: number) => {
    touchForest(x, y);
    if (soundOn) leafRustle((x / width) * 2 - 1);
  };

  return (
    <View style={styles.root} accessibilityLabel="나의 숲. 밤과 새벽 사이의 숲에서 작은 사람이 쉬고 있어요.">
      {/* 숲 만지기 (빈 곳 어디든) */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={(e) => touch(e.nativeEvent.pageX, e.nativeEvent.pageY)}
        accessibilityRole="button"
        accessibilityLabel="숲 만지기"
        accessibilityHint="누른 자리의 잎이 흔들리고 반딧불이가 다가와요"
      />

      {resting && <RestScene reduceMotion={reduceMotion} rain={weather === 'rain'} leaving={leaving} onLeft={onLeft} />}

      {/* 숲 속 동굴 입구 */}
      {!resting && (
      <Pressable
        onPress={enterCave}
        accessibilityRole="button"
        accessibilityLabel="동굴 입구. 누르면 동굴로 들어가요"
        style={[styles.caveSpot, { left: cave.x - 48, top: cave.y - 48 }]}
      >
        <Animated.Text style={[FOREST_TEXT.caption, styles.caveLabel, { opacity: uiOpacity }]}>동굴</Animated.Text>
      </Pressable>
      )}

      <SafeAreaView style={styles.safe} edges={['bottom']} pointerEvents="box-none">
        <View style={styles.spacer} pointerEvents="none" />
        {resting ? (
          <Animated.View style={[styles.restMenu, { opacity: uiOpacity }]} pointerEvents={uiHidden ? 'none' : 'box-none'}>
            <ForestChoiceGroup
              label="누워 쉴 때 소리"
              showLabel={false}
              align="center"
              options={[
                { value: 'nature' as RestSound, label: '자연음' },
                { value: 'flute' as RestSound, label: '피리 명상' },
                { value: 'vocal' as RestSound, label: '보컬 명상' },
              ]}
              value={restPick}
              onChange={pickSound}
            />
            <View style={styles.choicesRow}>
              <StayTimerMenu />
              <ForestButton label="일어나기" size="sm" variant="solid" onPress={getUp} />
            </View>
            {!soundOn && <Text style={FOREST_TEXT.caption}>소리가 꺼져 있어요. 위쪽 스피커로 켜면 들려요.</Text>}
          </Animated.View>
        ) : (
        <Animated.View style={[styles.choices, { opacity: uiOpacity }]} pointerEvents={uiHidden ? 'none' : 'box-none'}>
          <ForestButton label="숨 고르기" size="md" variant="solid" onPress={() => router.push('/forest/breathe?start=1')} accessibilityHint="누르면 바로 숨 고르기를 시작해요" />
          <ForestButton label="숲 거닐기" size="md" variant="solid" onPress={() => router.push('/forest/stay')} />
          <ForestButton label="동굴 가기" size="md" variant="solid" onPress={enterCave} accessibilityLabel="동굴 가기" />
          <ForestButton label="돗자리 펴고 눕기" size="md" variant="solid" onPress={lieDown} accessibilityHint="아이가 매트를 펴고 누워 쉬어요" />
          <StayTimerMenu />
        </Animated.View>
        )}
        {/* 메뉴가 숨었을 때만 보이는 작은 버튼 */}
        {uiHidden && (
          <Pressable onPress={wakeUi} accessibilityRole="button" accessibilityLabel="메뉴 보기" style={styles.handle}>
            <Text style={styles.handleText}>···</Text>
          </Pressable>
        )}
      </SafeAreaView>

      {entering && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.iris,
            {
              left: cave.x - reach / 2,
              top: cave.y - reach / 2,
              width: reach,
              height: reach,
              borderRadius: reach / 2,
              opacity: iris.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.85, 1] }),
              transform: [{ scale: iris.interpolate({ inputRange: [0, 1], outputRange: [0.04, 1] }) }],
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  safe: { flex: 1 },
  spacer: { flex: 1 },
  restMenu: { alignItems: 'center', gap: 10, paddingBottom: 28, paddingHorizontal: 12 },
  choicesRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingBottom: 28, paddingHorizontal: 12 },
  handle: { position: 'absolute', bottom: 18, alignSelf: 'center', minWidth: 56, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  handleText: { color: FOREST_UI.inkSoft, fontSize: 20, letterSpacing: 2, opacity: 0.6, ...FOREST_UI.textShadow },
  caveSpot: { position: 'absolute', width: 96, height: 96, alignItems: 'center', justifyContent: 'flex-end' },
  caveLabel: { marginBottom: -6, opacity: 0.85 },
  iris: { position: 'absolute', backgroundColor: '#07090a' },
});
