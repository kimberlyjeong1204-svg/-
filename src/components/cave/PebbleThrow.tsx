import { useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { pebbleHit } from '../../audio/caveSound';

/**
 * 조약돌 던지기
 * 바닥의 작은 조약돌을 골라 동굴 벽으로 던집니다. 끌어서 튕기거나, 눌러서 던질 수 있습니다.
 * 벽에 닿으면 딱 소리와 동굴 울림, 옅은 돌가루. 돌은 바닥으로 떨어져 사라지고 같은 자리에 새 돌이 놓입니다.
 * 점수·성공/실패 없음, 몇 번이든 던질 수 있음.
 */
type Props = { soundOn: boolean; reduceMotion: boolean };

const SLOTS = [0.2, 0.36, 0.52, 0.68, 0.82];
const SIZES = [1.05, 0.85, 1.2, 0.95, 0.8];

type Flight = { id: number; from: { x: number; y: number }; to: { x: number; y: number }; size: number; t: Animated.Value };
type Puff = { id: number; x: number; y: number; t: Animated.Value };

export function PebbleThrow({ soundOn, reduceMotion }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const native = Platform.OS !== 'web';
  const [hidden, setHidden] = useState<boolean[]>(SLOTS.map(() => false));
  const [flights, setFlights] = useState<Flight[]>([]);
  const [puffs, setPuffs] = useState<Puff[]>([]);
  const nextId = useRef(1);
  const groundY = H * 0.86;

  const throwFrom = (slot: number, from: { x: number; y: number }, vx: number, vy: number) => {
    const size = SIZES[slot];
    // 위로 세게 튕길수록 벽 높은 곳에, 옆으로 튕긴 만큼 옆으로
    const speed = Math.min(2.5, Math.max(0.6, -vy));
    const to = {
      x: Math.max(W * 0.12, Math.min(W * 0.88, from.x + vx * 160 + (Math.random() - 0.5) * 30)),
      y: Math.max(H * 0.16, Math.min(H * 0.5, H * 0.56 - speed * H * 0.12 + (Math.random() - 0.5) * 20)),
    };
    const id = nextId.current++;
    const t = new Animated.Value(0);
    setHidden((h) => h.map((v, i) => (i === slot ? true : v)));
    setFlights((f) => [...f, { id, from, to, size, t }]);
    Animated.timing(t, { toValue: 1, duration: reduceMotion ? 350 : 620, easing: Easing.out(Easing.quad), useNativeDriver: native }).start(() => {
      if (soundOn) pebbleHit((to.x / W) * 2 - 1, size);
      const pt = new Animated.Value(0);
      const pid = nextId.current++;
      setPuffs((p) => [...p, { id: pid, x: to.x, y: to.y, t: pt }]);
      Animated.timing(pt, { toValue: 1, duration: 900, useNativeDriver: native }).start(() => setPuffs((p) => p.filter((q) => q.id !== pid)));
      // 벽에 맞은 돌은 아래로 떨어지며 사라짐
      Animated.timing(t, { toValue: 2, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: native }).start(() => {
        setFlights((f) => f.filter((q) => q.id !== id));
      });
      // 같은 자리에 새 돌
      setTimeout(() => setHidden((h) => h.map((v, i) => (i === slot ? false : v))), 900);
    });
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {flights.map((f) => {
        const mid = { x: (f.from.x + f.to.x) / 2, y: Math.min(f.from.y, f.to.y) - H * 0.08 };
        return (
          <Animated.View
            key={f.id}
            pointerEvents="none"
            style={[
              styles.flying,
              {
                opacity: f.t.interpolate({ inputRange: [0, 1, 1.6, 2], outputRange: [1, 1, 0.7, 0] }),
                transform: [
                  { translateX: f.t.interpolate({ inputRange: [0, 0.5, 1, 2], outputRange: [f.from.x, mid.x, f.to.x, f.to.x] }) },
                  { translateY: f.t.interpolate({ inputRange: [0, 0.5, 1, 2], outputRange: [f.from.y, mid.y, f.to.y, f.to.y + H * 0.12] }) },
                  { scale: f.t.interpolate({ inputRange: [0, 1, 2], outputRange: [f.size, f.size * 0.38, f.size * 0.34] }) },
                ],
              },
            ]}
          >
            <Stone />
          </Animated.View>
        );
      })}
      {puffs.map((p) => (
        <Animated.View
          key={p.id}
          pointerEvents="none"
          style={[
            styles.puff,
            {
              left: p.x - 30,
              top: p.y - 30,
              opacity: p.t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] }),
              transform: [{ scale: p.t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.4] }) }],
            },
          ]}
        />
      ))}
      {SLOTS.map((u, i) =>
        hidden[i] ? null : <Pebble key={i} slot={i} x={W * u} y={groundY + (i % 2 ? 10 : 0)} size={SIZES[i]} onThrow={throwFrom} />,
      )}
    </View>
  );
}

function Pebble({ slot, x, y, size, onThrow }: { slot: number; x: number; y: number; size: number; onThrow: (slot: number, from: { x: number; y: number }, vx: number, vy: number) => void }) {
  const drag = useRef(new Animated.ValueXY()).current;
  const lift = useRef(new Animated.Value(1)).current;
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => Animated.spring(lift, { toValue: 1.15, useNativeDriver: false }).start(),
        onPanResponderMove: Animated.event([null, { dx: drag.x, dy: drag.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_e, g) => {
          lift.setValue(1);
          const from = { x: x + g.dx, y: y + g.dy };
          drag.setValue({ x: 0, y: 0 });
          // 그냥 눌렀다 떼면 위로 던짐
          const tap = Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6;
          onThrow(slot, from, tap ? (Math.random() - 0.5) * 0.6 : g.vx, tap ? -1.2 : Math.min(-0.4, g.vy));
        },
        onPanResponderTerminate: () => {
          lift.setValue(1);
          drag.setValue({ x: 0, y: 0 });
        },
      }),
    [drag, lift, onThrow, slot, x, y],
  );
  return (
    <Animated.View
      {...responder.panHandlers}
      accessibilityRole="button"
      accessibilityLabel="조약돌 던지기"
      style={[styles.pebble, { left: x - 28, top: y - 28, transform: [{ translateX: drag.x }, { translateY: drag.y }, { scale: Animated.multiply(lift, size) }] }]}
    >
      <Stone />
    </Animated.View>
  );
}

function Stone() {
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56">
      <Defs>
        <RadialGradient id="stone" cx="40%" cy="35%" r="65%">
          <Stop offset="0" stopColor="#8C8A84" />
          <Stop offset="0.6" stopColor="#55534F" />
          <Stop offset="1" stopColor="#2C2B29" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={28} cy={40} rx={15} ry={4} fill="#000" opacity={0.35} />
      <Ellipse cx={28} cy={33} rx={13} ry={9} fill="url(#stone)" />
      {/* 장작불 쪽에서 비치는 따뜻한 빛 */}
      <Ellipse cx={24} cy={29} rx={6} ry={3} fill="#FFB070" opacity={0.18} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  pebble: { position: 'absolute', width: 56, height: 56 },
  flying: { position: 'absolute', left: -28, top: -28, width: 56, height: 56 },
  puff: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(170, 160, 145, 0.35)' },
});
