import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * 홈 배경: 직접 그린 그래픽 (외부 이미지 없음)
 * - 창가 빛, 흐린 잎 그림자
 * (쉼표 2.0: 탁자 위 컵과 책은 뺐습니다. 울타리·문은 숲 입구 경험에서 다룹니다.)
 */
export function HomeBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={['#F8F6EF', '#F5F0E6', '#EDE3D4']} locations={[0, 0.62, 1]} style={StyleSheet.absoluteFill} />

      <Svg width={340} height={340} style={styles.light}>
        <Defs>
          <RadialGradient id="light" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFDF6" stopOpacity={0.9} />
            <Stop offset="0.7" stopColor="#FFFDF6" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={340} height={340} fill="url(#light)" />
      </Svg>

      <Svg width={230} height={420} viewBox="0 0 230 420" style={styles.leaves}>
        <G fill="#5E6E52" opacity={0.13}>
          <Path d="M10 0 C 60 90, 70 200, 40 420" stroke="#5E6E52" strokeWidth={4} fill="none" />
          <Ellipse cx={62} cy={40} rx={34} ry={11} rotation={-28} origin="62, 40" />
          <Ellipse cx={18} cy={82} rx={30} ry={10} rotation={32} origin="18, 82" />
          <Ellipse cx={96} cy={118} rx={40} ry={12} rotation={-18} origin="96, 118" />
          <Ellipse cx={22} cy={160} rx={32} ry={11} rotation={40} origin="22, 160" />
          <Ellipse cx={104} cy={206} rx={42} ry={13} rotation={-10} origin="104, 206" />
          <Ellipse cx={14} cy={246} rx={30} ry={10} rotation={30} origin="14, 246" />
          <Ellipse cx={92} cy={292} rx={38} ry={12} rotation={-24} origin="92, 292" />
          <Ellipse cx={8} cy={336} rx={28} ry={10} rotation={26} origin="8, 336" />
        </G>
      </Svg>

    </View>
  );
}

const styles = StyleSheet.create({
  light: { position: 'absolute', right: -80, top: -60 },
  leaves: { position: 'absolute', left: -46, top: 120 },
});
