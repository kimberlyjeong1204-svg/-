import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForestSpace } from '../../components/forest/ForestSpace';
import { FOREST_TEXT, ForestButton } from '../../components/forest/ui';
import { WindChime } from '../../components/forest/WindChime';
import { LOOK_MS, PLACES, WALK_MS, placeCover, type Place } from '../../components/forest/walkConfig';
import { useReduceMotion } from '../../components/BreathCircle';
import { setWalkMix, startSteps, stopSteps, stopWalk } from '../../audio/walkSound';

/**
 * 숲 거닐기 (예전 「숲에 머물기」 주소 /forest/stay를 그대로 씀)
 *
 * 숲길 → 폭포 → 큰 나무 아래를 장면으로 잇습니다(3D 자유 이동 아님).
 * - 「계속 걷기」: 지금 장면이 천천히 다가오며(걷는 듯 살짝 흔들림) 흐려지고 다음 장소가 드러남. 걷는 동안만 발소리
 * - 소리: 숲 기본 자연음은 숲 공간이 그대로 맡고, 장소 소리(물·잎·새)만 이동하는 동안 천천히 바뀜.
 *   폭포는 숲길에서부터 멀리 작게 들리다 가까워질수록 커짐
 * - 장소에 도착하면 필요한 선택만 작게(잠시 앉기 · 계속 걷기 · 돌아가기). 앉으면 버튼은 금방 숨고, 화면을 누르면 다시
 * - 큰 나무 아래: 나뭇가지에 매달린 나무 풍경(건드리거나 끌어 흔들기)
 * - 걸음 수·거리·타이머·미션 없음. 아무것도 하지 않고 머물러도 됨
 * 장면 그림은 통합 자산 v1(가로 그림). 세로 화면에서는 높이에 맞추고 도착하면 천천히 둘러봄(walkConfig.ts).
 */
const HIDE_DELAY = 5000;
const SIT_HIDE_DELAY = 3200;

export default function ForestWalk() {
  const { uiOpacity, uiHidden, wakeUi, setHideDelay, soundOn, soundStatus } = useForestSpace();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const native = Platform.OS !== 'web';
  const audible = soundOn && soundStatus === 'on';

  const [at, setAt] = useState(0);
  const [walk, setWalk] = useState<{ from: number; to: number } | null>(null);
  const [sitting, setSitting] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const sit = useRef(new Animated.Value(0)).current;
  const nameFade = useRef(new Animated.Value(0)).current;
  const place = PLACES[at];
  // 도착한 장소를 천천히 둘러봄(가로 그림을 세로 화면에서 잘리지 않게)
  const look = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const lookAround = useCallback(() => {
    look.setValue(reduceMotion ? 1 : 0);
    if (!reduceMotion) Animated.timing(look, { toValue: 1, duration: LOOK_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: native }).start();
  }, [look, reduceMotion, native]);
  useEffect(() => {
    lookAround();
    // 처음 들어올 때 한 번
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      setHideDelay(HIDE_DELAY);
      wakeUi();
      return () => setHideDelay(4000);
    }, [setHideDelay, wakeUi]),
  );
  useEffect(() => {
    setHideDelay(sitting ? SIT_HIDE_DELAY : HIDE_DELAY);
    wakeUi();
  }, [sitting, setHideDelay, wakeUi]);

  // 장소 소리: 소리가 실제로 날 때만. 떠나면 천천히 줄임
  useEffect(() => {
    if (!audible) {
      stopWalk(800);
      return;
    }
    if (!walk) setWalkMix(PLACES[at].mix, 2500);
  }, [audible, at, walk]);
  useEffect(() => () => stopWalk(1500), []);

  const showName = () => {
    nameFade.setValue(0);
    Animated.sequence([
      Animated.timing(nameFade, { toValue: 1, duration: 700, useNativeDriver: native }),
      Animated.delay(1600),
      Animated.timing(nameFade, { toValue: 0, duration: 900, useNativeDriver: native }),
    ]).start();
  };

  const go = (to: number) => {
    if (walk || to < 0 || to >= PLACES.length) return;
    setSitting(false);
    sit.setValue(0);
    setWalk({ from: at, to });
    progress.setValue(0);
    if (audible) {
      setWalkMix(PLACES[to].mix, WALK_MS);
      startSteps(PLACES[at].ground);
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 900 : WALK_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: native,
    }).start(() => {
      stopSteps(); // 멈추면 발소리도 바로 그침
      setAt(to);
      setWalk(null);
      lookAround();
      showName();
      wakeUi();
    });
  };

  const toggleSit = (on: boolean) => {
    setSitting(on);
    Animated.timing(sit, { toValue: on ? 1 : 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: native }).start();
  };

  // 걷는 느낌: 앞으로 다가가며 아주 살짝 위아래로
  const steps = useMemo(() => Array.from({ length: 41 }, (_, i) => i / 40), []);
  const bob = progress.interpolate({ inputRange: steps, outputRange: steps.map((p) => (reduceMotion ? 0 : Math.sin(p * Math.PI * 7) * 3 * Math.sin(p * Math.PI))) });
  const fromStyle = {
    opacity: progress.interpolate({ inputRange: [0, 0.5, 0.88], outputRange: [1, 1, 0], extrapolate: 'clamp' as const }),
    transform: [{ translateY: bob }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, reduceMotion ? 1 : 1.22] }) }],
  };
  const toStyle = {
    opacity: progress.interpolate({ inputRange: [0, 0.45, 0.92], outputRange: [0, 0, 1], extrapolate: 'clamp' as const }),
    transform: [{ translateY: bob }, { scale: progress.interpolate({ inputRange: [0.45, 1], outputRange: [reduceMotion ? 1 : 1.12, 1], extrapolate: 'clamp' as const }) }],
  };
  const sitStyle = {
    transform: [{ translateY: sit.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) }, { scale: sit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
  };

  const next = at + 1 < PLACES.length ? at + 1 : -1;
  const prev = at - 1;

  return (
    <View style={styles.root}>

      {/* 장소 장면 */}
      {walk ? (
        <>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fromStyle]}>
            <PlaceImage place={PLACES[walk.from]} w={width} h={height} pan={1} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, toStyle]}>
            <PlaceImage place={PLACES[walk.to]} w={width} h={height} pan={0} />
          </Animated.View>
        </>
      ) : (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, sitStyle]}>
          <PlaceImage place={place} w={width} h={height} pan={look} />
        </Animated.View>
      )}
      {/* 앉으면 가장자리를 조금 어둡게(풍경과 소리에 집중) */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.sitDim, { opacity: Animated.multiply(sit, 0.35) }]} />

      {/* 큰 나무 아래: 나뭇가지에 매달린 나무 풍경 */}
      {!walk && place.chime && (
        <ChimeOnBranch place={place} w={width} h={height} look={look} sit={sitStyle}>
          <WindChime width={width} soundOn={audible} reduceMotion={reduceMotion} anchorX={0.5} />
        </ChimeOnBranch>
      )}

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.center} pointerEvents="none">
          <Animated.Text style={[FOREST_TEXT.cue, { opacity: nameFade }]}>{place.name}</Animated.Text>
        </View>
        {!walk && (
          <Animated.View style={[styles.bottom, { opacity: uiOpacity }]} pointerEvents={uiHidden ? 'none' : 'box-none'}>
            <View style={styles.row}>
              {sitting ? (
                <>
                  <ForestButton label="일어나기" variant="solid" onPress={() => toggleSit(false)} />
                  {next >= 0 && <ForestButton label="계속 걷기" variant="solid" onPress={() => go(next)} />}
                </>
              ) : (
                <>
                  {prev >= 0 && <ForestButton label="돌아가기" variant="solid" onPress={() => go(prev)} accessibilityLabel={`${PLACES[prev].name}(으)로 돌아가기`} />}
                  {place.canSit && <ForestButton label="잠시 앉기" variant="solid" onPress={() => toggleSit(true)} />}
                  {next >= 0 && <ForestButton label="계속 걷기" variant="solid" onPress={() => go(next)} accessibilityLabel={`계속 걷기: ${PLACES[next].name}(으)로`} />}
                </>
              )}
            </View>
            {!audible && <Animated.Text style={FOREST_TEXT.caption}>숲소리를 켜면 장소마다 다른 소리가 들려요.</Animated.Text>}
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

/** 장소 그림: 화면 높이에 맞추고, pan(0~1)에 따라 panFrom → panTo로 가로 이동 */
function PlaceImage({ place, w, h, pan }: { place: Place; w: number; h: number; pan: number | Animated.Value }) {
  const a = placeCover(place, w, h, place.panFrom);
  const b = placeCover(place, w, h, place.panTo);
  const tx = typeof pan === 'number' ? a.ox + (b.ox - a.ox) * pan : pan.interpolate({ inputRange: [0, 1], outputRange: [a.ox, b.ox] });
  return (
    <View style={[StyleSheet.absoluteFill, styles.ground]}>
      <Animated.Image source={place.image} style={{ position: 'absolute', top: b.oy, left: 0, width: b.imgW, height: b.imgH, transform: [{ translateX: tx }] }} />
    </View>
  );
}

/** 나무 풍경을 그림 속 나뭇가지 자리에 매달고, 장면을 둘러볼 때 함께 움직임 */
function ChimeOnBranch({ place, w, h, look, sit, children }: { place: Place; w: number; h: number; look: Animated.Value; sit: object; children: ReactNode }) {
  const a = placeCover(place, w, h, place.panFrom);
  const b = placeCover(place, w, h, place.panTo);
  const u = place.chime!.u, v = place.chime!.v;
  // 풍경 상자(화면 폭) 가운데 = 나뭇가지 x, 위쪽 = 나뭇가지 y
  const xA = a.ox + u * a.imgW - w / 2, xB = b.ox + u * b.imgW - w / 2;
  const y = b.oy + v * b.imgH;
  return (
    <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: 0, top: y, width: w, transform: [{ translateX: look.interpolate({ inputRange: [0, 1], outputRange: [xA, xB] }) }] }, sit]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  safe: { flex: 1 },
  ground: { backgroundColor: '#0B1A1E', overflow: 'hidden' },
  sitDim: { backgroundColor: '#03080A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { alignItems: 'center', gap: 10, paddingBottom: 28, paddingHorizontal: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
});
