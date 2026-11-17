import { Animated, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { useBreathAnimation } from '../BreathCircle';

type Values = ReturnType<typeof useBreathAnimation>['values'];

/**
 * 숲 위의 작은 빛의 고리 (숨 고르기)
 * - 선만 있는 고리라 안쪽으로 숲이 그대로 보입니다.
 * - 숨에 따라 은은하게 커졌다 작아지고(70%~100%), 들이쉴수록 안쪽 빛이 아주 조금 밝아집니다.
 * - 내쉬는 동안에는 바깥으로 옅은 빛이 퍼졌다 사라집니다.
 * - 동작 줄이기 설정이면 크기 대신 밝기만 바뀝니다(useBreathAnimation이 처리).
 * size: 가장 커졌을 때 지름(px)
 */
export function BreathRing({ values, size = 140 }: { values: Values; size?: number }) {
  const halo = Math.round(size * 1.35);
  return (
    <Animated.View
      testID="breath-ring"
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.wrap, { width: size, height: size, opacity: Animated.multiply(values.visible, values.glow), transform: [{ scale: values.scale }] }]}
    >
      {/* 내쉬기 때 바깥으로 퍼지는 옅은 빛 */}
      <Animated.View style={[styles.layer, { width: halo, height: halo, opacity: Animated.multiply(values.haloOpacity, 0.6), transform: [{ scale: values.haloScale }] }]}>
        <Svg width={halo} height={halo} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="ringHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0.62" stopColor="#CFE6DA" stopOpacity={0} />
              <Stop offset="0.75" stopColor="#CFE6DA" stopOpacity={0.22} />
              <Stop offset="1" stopColor="#CFE6DA" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={50} cy={50} r={50} fill="url(#ringHalo)" />
        </Svg>
      </Animated.View>

      {/* 안쪽의 아주 옅은 빛: 들이쉴수록 조금 밝아짐 */}
      <Animated.View style={[styles.layer, { width: size, height: size, opacity: Animated.add(0.35, Animated.multiply(values.tone, 0.45)) }]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="ringInner" cx="50%" cy="50%" r="50%">
              <Stop offset="0.55" stopColor="#CFE6DA" stopOpacity={0} />
              <Stop offset="0.92" stopColor="#CFE6DA" stopOpacity={0.24} />
              <Stop offset="1" stopColor="#CFE6DA" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={50} cy={50} r={50} fill="url(#ringInner)" />
        </Svg>
      </Animated.View>

      {/* 고리 선: 기본 선 + 들이쉴수록 밝아지는 선(리듬이 안내 문구 없이도 보이게) */}
      <Svg width={size} height={size} viewBox="0 0 100 100" style={styles.layer}>
        <Circle cx={50} cy={50} r={48.6} fill="none" stroke="#EDE6D3" strokeOpacity={0.5} strokeWidth={1.2} />
      </Svg>
      <Animated.View style={[styles.layer, { width: size, height: size, opacity: values.tone }]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={48.4} fill="none" stroke="#F4EEDD" strokeOpacity={0.85} strokeWidth={1.8} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute' },
});
