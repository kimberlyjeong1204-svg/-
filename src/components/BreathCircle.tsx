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
  /** 0 = 가장 작음(옅은 색), 1 = 가장 큼(조금 짙은 색) */
  const tone = useRef(new Animated.Value(0)).current;

  return useMemo(
    () => ({
      values: { scale, glow, haloOpacity, haloScale, visible, tone },
      applyFrame(elapsedMs: number) {
        const f = breathFrame(elapsedMs, rhythm);
        tone.setValue(f.fullness);
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
        tone.setValue(0);
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
    [rhythm, reduceMotion, scale, glow, haloOpacity, haloScale, visible, tone],
  );
}

type Values = ReturnType<typeof useBreathAnimation>['values'];

/**
 * 호흡 원
 * - 여러 겹 테두리 대신, 원 하나의 색이 숨에 따라 부드럽게 짙어졌다 옅어집니다.
 * - 내쉬는 동안에는 원 바깥의 옅은 빛이 천천히 퍼지며 사라집니다(테두리 선 없음).
 * size: 원의 가장 큰 지름(px). 화면 높이에 맞춰 바깥에서 정합니다.
 */
export function BreathCircle({ values, size = BASE }: { values: Values; size?: number }) {
  const glowSize = Math.round(size * 1.18);
  return (
    <Animated.View
      testID="breath-circle"
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        styles.wrap,
        { width: size, height: size, opacity: Animated.multiply(values.visible, values.glow), transform: [{ scale: values.scale }] },
      ]}
    >
      {/* 내쉬기 때 퍼지는 옅은 빛 */}
      <Animated.View
        style={[
          styles.layer,
          { width: glowSize, height: glowSize, opacity: values.haloOpacity, transform: [{ scale: values.haloScale }] },
        ]}
      >
        <Svg width={glowSize} height={glowSize} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="aura" cx="50%" cy="50%" r="50%">
              <Stop offset="0.72" stopColor={colors.sage} stopOpacity={0.35} />
              <Stop offset="1" stopColor={colors.sage} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={50} cy={50} r={50} fill="url(#aura)" />
        </Svg>
      </Animated.View>

      {/* 기본 원: 가운데가 밝고 가장자리로 갈수록 세이지 */}
      <Svg width={size} height={size} viewBox="0 0 100 100" style={styles.layer}>
        <Defs>
          <RadialGradient id="core" cx="50%" cy="44%" r="56%">
            <Stop offset="0" stopColor="#E6ECE0" stopOpacity={1} />
            <Stop offset="0.75" stopColor={colors.sageLight} stopOpacity={1} />
            <Stop offset="1" stopColor="#C4D0B8" stopOpacity={1} />
          </RadialGradient>
        </Defs>
        <Circle cx={50} cy={50} r={50} fill="url(#core)" />
      </Svg>

      {/* 숨을 들이쉴수록 살짝 짙어지는 색 */}
      <Animated.View style={[styles.layer, { width: size, height: size, opacity: Animated.multiply(values.tone, 0.85) }]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="deep" cx="50%" cy="46%" r="54%">
              <Stop offset="0" stopColor={colors.sage} stopOpacity={0.35} />
              <Stop offset="1" stopColor={colors.sage} stopOpacity={0.85} />
            </RadialGradient>
          </Defs>
          <Circle cx={50} cy={50} r={50} fill="url(#deep)" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute' },
});
