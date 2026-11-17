import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';
import { FOREST_UI } from './forestUi';
import { HIT, radius, type } from '../../theme';

/**
 * 숲 입구 (처음 방문 때 한 번)
 *
 * 낡은 나무 울타리와 「방해금지」 문. 문을 누르면(또는 첫 소리 안내에서 고르면) 문이 묵직하게 천천히 열리고,
 * 카메라가 문을 지나 지금의 숲으로 들어갑니다. 문 너머로 보이는 숲은 이 화면 뒤에 이미 떠 있는 실제 숲 화면이라,
 * 마지막에는 같은 구도의 숲에 그대로 도착합니다(그림이 바뀌는 이음새가 없음).
 *
 * - 그림: 문짝 한 장을 원근감 있게 회전(3D 엔진 없이 transform). 지금은 레퍼런스로 만든 임시 그림입니다.
 * - 동작 줄이기 설정이면 문 연출 없이 0.7초 동안 서서히 사라집니다.
 * - 「바로 들어가기」로 언제든 건너뛸 수 있습니다.
 */

const FRAME = require('../../../assets/forest/gate-temp/gate-frame.webp');
const DOOR = require('../../../assets/forest/gate-temp/gate-door.webp');

// 원본 그림 좌표(941×1672)
const SRC = { w: 941, h: 1672 };
const DOOR_RECT = { x: 232, y: 640, w: 516, h: 604 };
const FOCUS = { x: 490, y: 905 }; // 카메라가 다가가는 지점 = 문 통로 가운데

/** 문이 열리기 시작한 뒤 전체 길이(초) */
export const GATE_DURATION_SEC = 6.4;

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const easeInOutCubic = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const easeInOutQuad = (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

// 시간(문이 열리기 시작한 뒤 초) → 각 값. 처음에 살짝 걸렸다가(2°) 천천히, 묵직하게 열림
const doorDeg = (t: number) => {
  const nudge = Math.sin(Math.PI * seg(t, 0, 0.5)) * 2.2;
  const u = seg(t, 0.45, 3.1);
  return nudge * (1 - u) + 78 * easeInOutQuad(u);
};
const push = (t: number) => easeInOutCubic(seg(t, 2.2, 5.6));
const CURVES = {
  door: (t: number) => `${doorDeg(t).toFixed(2)}deg`,
  shade: (t: number) => 0.55 * Math.sin((doorDeg(t) * Math.PI) / 180),
  glow: (t: number) => (0.15 + 0.85 * (doorDeg(t) / 78)) * (1 - seg(t, 4.8, 6.0)),
  scale: (t: number) => 1 + 2.6 * push(t),
  gateOpacity: (t: number) => 1 - seg(t, 4.6, 5.6),
  fog: (t: number) => clamp((0.55 + 0.9 * Math.sin(Math.PI * seg(t, 2.6, 5.9))) * (1 - seg(t, 5.3, 6.4))),
  fogScale: (t: number) => 1 + push(t),
  dim: (t: number) => 0.28 * (1 - seg(t, 3.0, 6.0)),
  vignette: (t: number) => 1 - seg(t, 5.0, 6.4),
};
// 반딧불이마다 깜빡이는 때를 다르게
const TWINKLE = [
  [0.25, 0.9, 0.35, 0.8, 0.25],
  [0.8, 0.3, 0.9, 0.4, 0.8],
  [0.5, 0.85, 0.2, 0.7, 0.5],
  [0.3, 0.6, 0.95, 0.35, 0.3],
  [0.9, 0.4, 0.6, 0.2, 0.9],
];
const STEPS = Array.from({ length: Math.round(GATE_DURATION_SEC * 10) + 1 }, (_, i) => i / 10);

type Props = {
  /** true가 되면 문이 열리기 시작 */
  opening: boolean;
  reduceMotion: boolean;
  /** 문을 눌렀을 때 (첫 소리 안내가 떠 있지 않을 때만 받음) */
  onRequestOpen?: () => void;
  /** 숲에 도착(또는 건너뜀) */
  onDone: () => void;
  /** 문 앞에서 보일 안내 문구 (소리 안내창이 떠 있으면 숨김) */
  showTapHint: boolean;
};

export function ForestGate({ opening, reduceMotion, onRequestOpen, onDone, showTapHint }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const t = useRef(new Animated.Value(0)).current;
  const overlay = useRef(new Animated.Value(1)).current;
  const idle = useRef(new Animated.Value(0)).current;
  const native = Platform.OS !== 'web';
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const finished = useRef(false);
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    doneRef.current();
  };

  // 문 앞에서: 반딧불이 깜빡임·안개 흔들림
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(Animated.timing(idle, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, [idle, native, reduceMotion]);

  useEffect(() => {
    if (!opening) return;
    if (reduceMotion) {
      Animated.timing(overlay, { toValue: 0, duration: 700, useNativeDriver: native }).start(finish);
      return;
    }
    const anim = Animated.timing(t, { toValue: GATE_DURATION_SEC, duration: GATE_DURATION_SEC * 1000, easing: Easing.linear, useNativeDriver: native });
    anim.start(({ finished: ok }) => ok && finish());
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opening, reduceMotion]);

  const skip = () => {
    t.stopAnimation();
    Animated.timing(overlay, { toValue: 0, duration: 450, useNativeDriver: native }).start(finish);
  };

  const v = useMemo(() => {
    const make = (fn: (x: number) => number | string) =>
      t.interpolate<number | string>({ inputRange: STEPS, outputRange: STEPS.map(fn) as number[], extrapolate: 'clamp' });
    return Object.fromEntries(Object.entries(CURVES).map(([k, fn]) => [k, make(fn)])) as Record<keyof typeof CURVES, Animated.AnimatedInterpolation<number | string>>;
  }, [t]);

  // 화면을 가득 채우도록(cover) 원본 그림을 놓기
  const k = size.w ? Math.max(size.w / SRC.w, size.h / SRC.h) : 0;
  const ox = (size.w - SRC.w * k) / 2;
  const oy = (size.h - SRC.h * k) / 2;
  const fx = FOCUS.x * k + ox;
  const fy = FOCUS.y * k + oy;
  const origin = `${fx}px ${fy}px`;
  const doorW = DOOR_RECT.w * k;
  const doorH = DOOR_RECT.h * k;

  const flies = [
    [0.1, 0.83],
    [0.85, 0.82],
    [0.77, 0.66],
    [0.24, 0.97],
    [0.51, 0.72],
  ] as const;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: overlay }]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      accessibilityLabel="숲 입구. 「방해금지」 푯말이 걸린 낡은 나무 문"
    >
      {k > 0 && (
        <>
          {/* 문 너머 숲을 처음에는 조금 어둡게: 문이 열릴수록 밝아짐 */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, { opacity: v.dim }]} />
          {/* 문틈으로 스미는 빛 */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: v.glow }]}>
            <Svg width={size.w} height={size.h}>
              <Defs>
                <RadialGradient id="g" cx={fx} cy={fy + 10} rx={300 * k} ry={380 * k} gradientUnits="userSpaceOnUse">
                  <Stop offset="0" stopColor="#AAD7CD" stopOpacity={0.42} />
                  <Stop offset="0.55" stopColor="#78B4AF" stopOpacity={0.14} />
                  <Stop offset="1" stopColor="#78B4AF" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect width={size.w} height={size.h} fill="url(#g)" />
            </Svg>
          </Animated.View>

          {/* 울타리·문: 카메라가 다가가면 커지며 지나감 */}
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { opacity: v.gateOpacity, transformOrigin: origin, transform: [{ scale: v.scale as Animated.AnimatedInterpolation<number> }] }]}
          >
            <Image source={FRAME} style={{ position: 'absolute', left: ox, top: oy, width: SRC.w * k, height: SRC.h * k }} />
            <Animated.View
              style={{
                position: 'absolute',
                left: DOOR_RECT.x * k + ox,
                top: DOOR_RECT.y * k + oy,
                width: doorW,
                height: doorH,
                transformOrigin: 'left center',
                transform: [{ perspective: doorW * 2.4 }, { rotateY: v.door as Animated.AnimatedInterpolation<string> }],
              }}
            >
              {/* 웹에서는 크기를 꼭 적어야 원본 크기로 커지지 않음 */}
              <Image source={DOOR} style={{ position: 'absolute', left: 0, top: 0, width: doorW, height: doorH }} />
              {/* 문이 돌아갈수록 그늘이 짐 */}
              <Animated.Image source={DOOR} tintColor="#050B0D" style={{ position: 'absolute', left: 0, top: 0, width: doorW, height: doorH, opacity: v.shade }} />
            </Animated.View>
            {!reduceMotion &&
              flies.map(([x, y], i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.fly,
                    {
                      left: x * size.w,
                      top: y * size.h,
                      opacity: idle.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: TWINKLE[i % TWINKLE.length] }),
                    },
                  ]}
                />
              ))}
          </Animated.View>

          {/* 안개: 문을 지날 때 잠깐 짙어져 입구와 숲을 이어 줌 */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: v.fog, transform: [{ scale: v.fogScale as Animated.AnimatedInterpolation<number> }] }]}>
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: idle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-10, 10, -10] }) }] }]}>
              <Svg width={size.w} height={size.h}>
                <Defs>
                  <RadialGradient id="f" cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor="#96BEBE" stopOpacity={0.2} />
                    <Stop offset="0.45" stopColor="#96BEBE" stopOpacity={0.09} />
                    <Stop offset="1" stopColor="#96BEBE" stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Ellipse cx={size.w * 0.54} cy={size.h * 0.73} rx={size.w * 0.42} ry={size.h * 0.08} fill="url(#f)" />
                <Ellipse cx={size.w * 0.92} cy={size.h * 0.82} rx={size.w * 0.36} ry={size.h * 0.07} fill="url(#f)" />
                <Ellipse cx={size.w * 0.62} cy={size.h * 0.55} rx={size.w * 0.32} ry={size.h * 0.06} fill="url(#f)" />
                <Ellipse cx={size.w * 0.28} cy={size.h * 0.91} rx={size.w * 0.42} ry={size.h * 0.09} fill="url(#f)" />
              </Svg>
            </Animated.View>
          </Animated.View>

          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: v.vignette }]}>
            <Svg width={size.w} height={size.h}>
              <Defs>
                <RadialGradient id="v" cx="50%" cy="55%" r="70%">
                  <Stop offset="0.55" stopColor="#03080A" stopOpacity={0} />
                  <Stop offset="1" stopColor="#03080A" stopOpacity={0.55} />
                </RadialGradient>
              </Defs>
              <Rect width={size.w} height={size.h} fill="url(#v)" />
            </Svg>
          </Animated.View>
        </>
      )}

      {/* 문 앞: 화면 어디를 눌러도 문이 열림 */}
      {!opening && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onRequestOpen}
          disabled={!onRequestOpen}
          accessibilityRole="button"
          accessibilityLabel="문 열고 숲으로 들어가기"
        >
          {showTapHint && (
            <View style={styles.bottom} pointerEvents="none">
              <Text style={styles.tapHint}>문을 눌러 들어가기</Text>
            </View>
          )}
        </Pressable>
      )}

      {opening && !reduceMotion && (
        <View style={styles.bottom} pointerEvents="box-none">
          <Pressable onPress={skip} accessibilityRole="button" style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}>
            <Text style={styles.skipText}>바로 들어가기</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: '#03080A' },
  fly: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#F6F1B0',
    boxShadow: '0 0 8px 3px rgba(240, 236, 150, 0.55)',
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 44, alignItems: 'center' },
  tapHint: { ...type.small, color: FOREST_UI.inkSoft, ...FOREST_UI.textShadow, letterSpacing: 0.5 },
  skip: { minHeight: HIT, paddingHorizontal: 18, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: 'rgba(10, 22, 24, 0.45)' },
  skipText: { ...type.small, fontSize: 14, color: FOREST_UI.inkSoft },
});
