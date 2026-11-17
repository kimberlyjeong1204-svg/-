import { Image, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ForestGate } from './forest/ForestGate';
import { useReduceMotion } from './BreathCircle';

const FOREST_BG = require('../../assets/forest/forest-bg.webp');

/**
 * 홈 표지 배경 (A1: 문 앞 몇 걸음 뒤) — 홈과 「숲 선물」 환영 화면이 함께 씀
 * 「방해금지」 문이 있는 숲 입구, 문틈으로 실제 숲 그림. 글자가 읽히도록 위·아래만 살짝 어둡게.
 */
export function HomeCover() {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  return (
    <>
      <Image
        source={FOREST_BG}
        style={{ position: 'absolute', left: 0, top: 0, width, height }}
        resizeMode="cover"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <ForestGate cover reduceMotion={reduceMotion} />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#060E10" stopOpacity={0.78} />
            <Stop offset="0.36" stopColor="#060E10" stopOpacity={0.22} />
            <Stop offset="0.62" stopColor="#060E10" stopOpacity={0.08} />
            <Stop offset="1" stopColor="#060E10" stopOpacity={0.62} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#shade)" />
      </Svg>
    </>
  );
}
