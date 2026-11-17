import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForestSpace } from './ForestSpace';
import { FOREST_TEXT, ForestButton } from './ui';
import { WindChime } from './WindChime';
import { FADE_MS, PLACES, WALK_MS, placeCover, type Place } from './walkConfig';
import { useReduceMotion } from '../BreathCircle';
import { setWalkMix, startSteps, stopSteps, stopWalk } from '../../audio/walkSound';

/**
 * 숲 거닐기 — 장면 이어 보기 (iOS 앱용). 웹은 WalkWorld.web.tsx의 3D 숲길.
 * 정지 그림을 잇는 방식이라 「걷기」가 아니라 장소 둘러보기에 가깝습니다.
 *
 * 숲길 → 폭포 → 큰 나무 아래를 장면으로 잇습니다.
 * - 화면: 장소마다 구도를 고정(확대·축소·흐림·카메라 이동 없음). 이동은 걷는 동안 발소리만 나다가 0.6초 크로스페이드
 * - 버튼: 숲길 = 계속 걷기 / 도착(앉을 자리가 보이는 곳) = 잠시 앉기 · 계속 걷기(마지막 장소는 돌아가기) /
 *   앉음 = 일어나기 / 일어난 뒤 = 잠시 앉기 · 돌아가기 · 계속 걷기(다시 앉을 수 있게). 숲에서 나가기는 늘 왼쪽 위
 * - 앉기: 눈높이가 아주 조금 낮아짐(장면이 몇 px 위로), 고정. 일어나면 같은 자리로 정확히 돌아옴(누적 없음)
 * - 소리: 걷는 동안만 발소리. 장소 소리는 이동하는 동안 다음 장소 쪽으로 천천히(폭포는 가까워질수록 커짐). 소리가 꺼져 있으면 재생하지 않음
 * 장면 그림은 통합 자산 v1(가로 765×508). 해상도가 낮아 고해상도 세로 그림으로 교체 필요.
 */
const HIDE_DELAY = 5000;
const SIT_HIDE_DELAY = 3200;
/** 앉으면 눈높이가 낮아진 만큼 장면이 위로 보이는 정도(px). 그림은 이만큼 여유를 두고 고정 크기로 그림 */
const SIT_SHIFT = 10;

type Stage = 'arrived' | 'sitting' | 'stood';

export function WalkScenes() {
  const { uiOpacity, uiHidden, wakeUi, setHideDelay, soundOn, soundStatus } = useForestSpace();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const native = Platform.OS !== 'web';
  const audible = soundOn && soundStatus === 'on';

  const [at, setAt] = useState(0);
  const [from, setFrom] = useState<number | null>(null); // 크로스페이드 중인 이전 장소
  const [moving, setMoving] = useState(false);
  const [stage, setStage] = useState<Stage>('arrived');
  const busy = useRef(false); // 전환이 겹치지 않게
  const fade = useRef(new Animated.Value(1)).current;
  const sit = useRef(new Animated.Value(0)).current;
  const place = PLACES[at];

  useFocusEffect(
    useCallback(() => {
      setHideDelay(HIDE_DELAY);
      wakeUi();
      return () => setHideDelay(4000);
    }, [setHideDelay, wakeUi]),
  );
  useEffect(() => {
    setHideDelay(stage === 'sitting' ? SIT_HIDE_DELAY : HIDE_DELAY);
    wakeUi();
  }, [stage, setHideDelay, wakeUi]);

  // 장소 소리: 소리가 실제로 날 때만. 떠나면 천천히 줄임
  useEffect(() => {
    if (!audible) {
      stopWalk(800);
      return;
    }
    if (!moving) setWalkMix(PLACES[at].mix, 2500);
  }, [audible, at, moving]);
  useEffect(() => () => stopWalk(1500), []);

  const setSit = (on: boolean, done?: () => void) => {
    Animated.timing(sit, {
      toValue: on ? 1 : 0,
      duration: reduceMotion ? 1 : 700,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: native,
    }).start(() => done?.());
  };

  const go = (to: number) => {
    if (busy.current || to < 0 || to >= PLACES.length || to === at) return;
    busy.current = true;
    const walkOn = () => {
      setMoving(true);
      if (audible) {
        setWalkMix(PLACES[to].mix, WALK_MS + FADE_MS);
        startSteps(place.ground);
      }
      // 걷는 동안(발소리) 화면은 그대로, 마지막에 짧게 크로스페이드
      setTimeout(() => {
        setFrom(at);
        setAt(to);
        fade.setValue(0);
        Animated.timing(fade, { toValue: 1, duration: reduceMotion ? 200 : FADE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: native }).start(() => {
          stopSteps(); // 멈추면 발소리도 바로 그침
          setFrom(null);
          setMoving(false);
          setStage('arrived');
          busy.current = false;
          wakeUi();
        });
      }, reduceMotion ? 300 : WALK_MS);
    };
    // 앉아 있었으면 먼저 일어남
    if (stage === 'sitting') setSit(false, walkOn);
    else walkOn();
  };

  const sitDown = () => {
    if (busy.current) return;
    setStage('sitting');
    setSit(true);
  };
  const standUp = () => {
    if (busy.current) return;
    setSit(false);
    setStage('stood');
  };

  // 앉을 자리가 지금 화면에 보이는지
  const seatVisible = (() => {
    if (!place.seat) return false;
    const c = placeCover(place, width, height + SIT_SHIFT * 2, place.center);
    const x = c.ox + place.seat.u * c.imgW;
    return x > 20 && x < width - 20;
  })();
  const next = at + 1 < PLACES.length ? at + 1 : -1;
  const prev = at - 1;
  const showBack = prev >= 0 && (stage === 'stood' || next < 0 || !seatVisible);

  const sitY = sit.interpolate({ inputRange: [0, 1], outputRange: [0, -SIT_SHIFT] });

  return (
    <View style={styles.root}>
      {/* 장소 장면: 이전 장소 위로 새 장소가 0.6초 동안 겹쳐 나타남 */}
      {from != null && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <PlaceImage place={PLACES[from]} w={width} h={height} />
        </View>
      )}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade, transform: [{ translateY: sitY }] }]}>
        <PlaceImage place={place} w={width} h={height} />
      </Animated.View>
      {/* 큰 나무 아래: 그림 속 나뭇가지에 매달린 나무 풍경(장면과 함께 고정) */}
      {place.chime && from == null && (
        <ChimeOnBranch place={place} w={width} h={height} sitY={sitY}>
          <WindChime width={width} soundOn={audible} reduceMotion={reduceMotion} anchorX={0.5} />
        </ChimeOnBranch>
      )}

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.spacer} pointerEvents="none" />
        {!moving && (
          <Animated.View style={[styles.bottom, { opacity: uiOpacity }]} pointerEvents={uiHidden ? 'none' : 'box-none'}>
            <View style={styles.row}>
              {stage === 'sitting' ? (
                <ForestButton label="일어나기" variant="solid" onPress={standUp} />
              ) : (
                <>
                  {seatVisible && <ForestButton label="잠시 앉기" variant="solid" onPress={sitDown} />}
                  {showBack && <ForestButton label="돌아가기" variant="solid" onPress={() => go(prev)} accessibilityLabel={`${PLACES[prev].name}(으)로 돌아가기`} />}
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

/** 장소 그림: 화면 높이(+앉기 여유)에 맞추고 center를 가운데에 고정 — 움직이지 않음 */
function PlaceImage({ place, w, h }: { place: Place; w: number; h: number }) {
  const c = placeCover(place, w, h + SIT_SHIFT * 2, place.center);
  return (
    <View style={[StyleSheet.absoluteFill, styles.ground]}>
      <Animated.Image source={place.image} style={{ position: 'absolute', top: c.oy, left: c.ox, width: c.imgW, height: c.imgH }} />
    </View>
  );
}

/** 나무 풍경을 그림 속 나뭇가지 자리에 매닮 (장면과 같이 고정, 앉으면 같이 조금 올라감) */
function ChimeOnBranch({ place, w, h, sitY, children }: { place: Place; w: number; h: number; sitY: Animated.AnimatedInterpolation<number>; children: ReactNode }) {
  const c = placeCover(place, w, h + SIT_SHIFT * 2, place.center);
  const x = c.ox + place.chime!.u * c.imgW - w / 2;
  const y = c.oy + place.chime!.v * c.imgH;
  return (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: x, top: y, width: w, transform: [{ translateY: sitY }] }}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  safe: { flex: 1 },
  spacer: { flex: 1 },
  ground: { backgroundColor: '#0B1A1E', overflow: 'hidden' },
  bottom: { alignItems: 'center', gap: 10, paddingBottom: 28, paddingHorizontal: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
});
