import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';
import { CAVE_IMAGE, FIRE, caveCover } from './caveConfig';

/**
 * 동굴 화면 (iOS 앱) — 바위 그림 + 일렁이는 불빛과 단순한 불꽃.
 * 입자 불꽃은 웹앱(CaveScene.web.tsx)에 먼저 넣었고, 앱에는 이후 단계에서 같은 모양으로 연결합니다.
 */
export function CaveScene({ reduceMotion, flare = 0 }: { reduceMotion: boolean; flare?: number }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const flick = useRef(new Animated.Value(1)).current;
  const boost = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flick, { toValue: 0.82, duration: 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flick, { toValue: 1, duration: 610, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flick, { toValue: 0.9, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [flick, reduceMotion]);
  useEffect(() => {
    if (!flare) return;
    boost.setValue(1);
    Animated.timing(boost, { toValue: 0, duration: 3200, useNativeDriver: true }).start();
  }, [flare, boost]);

  const c = caveCover(size.w, size.h);
  const f = c.toScreen(FIRE.x, FIRE.y);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size.w > 0 && (
        <>
          <Image source={CAVE_IMAGE.source} style={{ position: 'absolute', left: c.ox, top: c.oy, width: CAVE_IMAGE.width * c.k, height: CAVE_IMAGE.height * c.k }} />
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: Animated.add(flick, Animated.multiply(boost, 0.5)) }]}>
            <Svg width={size.w} height={size.h}>
              <Defs>
                <RadialGradient id="warm" cx={f.x} cy={f.y - 20} rx={size.w * 0.9} ry={size.w * 0.9} gradientUnits="userSpaceOnUse">
                  <Stop offset="0" stopColor="#FF9646" stopOpacity={0.32} />
                  <Stop offset="0.35" stopColor="#C85F28" stopOpacity={0.14} />
                  <Stop offset="1" stopColor="#783214" stopOpacity={0} />
                </RadialGradient>
                <RadialGradient id="flame" cx="50%" cy="70%" r="50%">
                  <Stop offset="0" stopColor="#FFE3A0" stopOpacity={0.95} />
                  <Stop offset="0.5" stopColor="#FF8A3C" stopOpacity={0.6} />
                  <Stop offset="1" stopColor="#B83C1E" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect width={size.w} height={size.h} fill="url(#warm)" />
              <Ellipse cx={f.x} cy={f.y - 34} rx={34} ry={52} fill="url(#flame)" />
            </Svg>
          </Animated.View>
        </>
      )}
    </View>
  );
}
