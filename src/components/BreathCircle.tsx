import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { MIN_SCALE, breathFrame, type Rhythm } from '../lib/breath';
import { colors } from '../theme';

const BASE = 290;

/** 아이폰의 「동작 줄이기」 설정을 따릅니다. */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

/**
 * 호흡 원의 움직임.
 * 매 프레임 경과 시간으로 크기를 계산해 바로 적용합니다(리렌더링 없음).
 * 동작 줄이기가 켜져 있으면 크기 대신 밝기만 같은 리듬으로 바뀝니다.
 */
export function useBreathAnimation(rhythm: Rhythm, reduceMotion: boolean) {
  const scale = useRef(new Animated.Value(MIN_SCALE)).current;
  const glow = useRef(new Animated.Value(reduceMotion ? 0.5 : 1)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const haloScale = useRef(new Animated.Value(1)).current;
  const visible = useRef(new Animated.Value(1)).current;

  return useMemo(
    () => ({
      values: { scale, glow, haloOpacity, haloScale, visible },
      applyFrame(elapsedMs: number) {
        const f = breathFrame(elapsedMs, rhythm);
        if (reduceMotion) {
          scale.setValue(0.86);
          glow.setValue(0.5 + 0.5 * f.fullness);
          haloOpacity.setValue(0);
        } else {
          scale.setValue(f.scale);
          glow.setValue(1);
          haloOpacity.setValue(f.haloOpacity);
          haloScale.setValue(f.haloScale);
        }
      },
      rest() {
        visible.setValue(1);
        scale.setValue(reduceMotion ? 0.86 : MIN_SCALE);
        glow.setValue(reduceMotion ? 0.5 : 1);
        haloOpacity.setValue(0);
        haloScale.setValue(1);
      },
      /** 끝났을 때: 원이 천천히 사라짐 */
      fadeOut() {
        Animated.timing(visible, {
          toValue: 0,
          duration: 2200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      },
    }),
    [rhythm, reduceMotion, scale, glow, haloOpacity, haloScale, visible],
  );
}

type Values = ReturnType<typeof useBreathAnimation>['values'];

/** size: 원의 가장 큰 지름(px). 화면 높이에 맞춰 바깥에서 정합니다. */
export function BreathCircle({ values, size = BASE }: { values: Values; size?: number }) {
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        styles.wrap,
        { width: size, height: size, opacity: Animated.multiply(values.visible, values.glow), transform: [{ scale: values.scale }] },
      ]}
    >
      <Animated.View
        style={[
          styles.halo,
          { borderRadius: (size + 20) / 2, opacity: values.haloOpacity, transform: [{ scale: values.haloScale }] },
        ]}
      />
      <Svg width={size} height={size} viewBox="0 0 290 290">
        <Defs>
          <RadialGradient id="core" cx="50%" cy="45%" r="50%">
            <Stop offset="0" stopColor={colors.sageLight} stopOpacity={0.9} />
            <Stop offset="0.7" stopColor={colors.sage} stopOpacity={0.55} />
            <Stop offset="1" stopColor={colors.sage} stopOpacity={0.35} />
          </RadialGradient>
        </Defs>
        <Circle cx={145} cy={145} r={145} fill="url(#core)" />
        <Circle cx={154} cy={147} r={140} fill={colors.sage} fillOpacity={0.18} />
        <Circle cx={139} cy={140} r={141} fill={colors.sage} fillOpacity={0.14} />
        <Circle cx={145} cy={145} r={117} fill={colors.sage} fillOpacity={0.24} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderWidth: 1.5,
    borderColor: 'rgba(168,184,154,0.7)',
  },
});
