import { useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { pebbleHit } from '../../audio/caveSound';
import { fireOnScreen } from './caveConfig';

/**
 * 조약돌 던지기
 * 바닥의 작은 조약돌을 골라, 손가락으로 끈 방향의 동굴 안쪽 암벽으로 던집니다(누르기만 하면 바로 위 암벽).
 * 돌은 안쪽으로 날아가며 작아지고, 화면에서 맞는 자리 = 실제 충돌 위치. 장작불·사람 쪽과 화면 밖으로는 날아가지 않음.
 * 벽에 닿으면 딱 소리와 동굴 울림, 옅은 돌가루. 돌은 바닥으로 떨어져 사라지고 같은 자리에 새 돌이 놓입니다.
 * 점수·성공/실패 없음, 몇 번이든 던질 수 있음.
 */
type Props = { soundOn: boolean; reduceMotion: boolean };

const SLOTS = [0.2, 0.36, 0.52, 0.68, 0.82];
const SIZES = [1.05, 0.85, 1.2, 0.95, 0.8];

type Flight = { id: number; from: { x: number; y: number }; to: { x: number; y: number }; size: number; endScale: number; t: Animated.Value };
type Puff = { id: number; x: number; y: number; s: number; t: Animated.Value };

export function PebbleThrow({ soundOn, reduceMotion }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const native = Platform.OS !== 'web';
  const [hidden, setHidden] = useState<boolean[]>(SLOTS.map(() => false));
  const [flights, setFlights] = useState<Flight[]>([]);
  const [puffs, setPuffs] = useState<Puff[]>([]);
  const nextId = useRef(1);
  const groundY = H * 0.86;

  // 던질 수 있는 곳: 동굴 안쪽 암벽(화면 위쪽~가운데). 장작불·사람(아이) 쪽과 화면 밖은 제외
  const fire = fireOnScreen(W, H);
  const keepOut = (x: number, y: number) =>
    (Math.abs(x - fire.x) < W * 0.14 && y > fire.y - H * 0.3) || // 장작불과 그 위 연기
    (x > W * 0.74 && y > H * 0.5); // 앉아 있는 사람 쪽
  const toWall = (x: number, y: number) => {
    let tx = Math.max(W * 0.08, Math.min(W * 0.92, x));
    let ty = Math.max(H * 0.14, Math.min(H * 0.56, y));
    if (keepOut(tx, ty)) {
      // 금지 영역이면 가장 가까운 위쪽 암벽으로
      ty = Math.min(ty, fire.y - H * 0.32);
      if (tx > W * 0.74) ty = Math.min(ty, H * 0.48);
    }
    return { x: tx, y: ty };
  };

  /** from: 돌을 집은 곳, release: 손가락을 뗀 곳. 끈 방향의 연장선 위 암벽에 맞음 */
  const throwFrom = (slot: number, from: { x: number; y: number }, release: { x: number; y: number }) => {
    const size = SIZES[slot];
    let dx = release.x - from.x, dy = release.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 12 || dy > -6) {
      // 그냥 누르거나 아래로 끌면: 바로 위 암벽으로
      dx = (Math.random() - 0.5) * W * 0.25;
      dy = -H * 0.45;
    } else {
      // 끈 방향 그대로, 길게 끌수록 더 멀리(높이) — 암벽까지 연장
      const k = Math.max(1.8, (H * 0.5) / Math.max(1, -dy));
      dx *= k;
      dy *= k;
    }
    const to = toWall(from.x + dx, from.y + dy);
    // 멀리(위쪽) 맞을수록 작게 보임
    const far = 1 - (to.y - H * 0.14) / (H * 0.42);
    const endScale = size * (0.42 - 0.2 * far);
    const id = nextId.current++;
    const t = new Animated.Value(0);
    setHidden((h) => h.map((v, i) => (i === slot ? true : v)));
    setFlights((f) => [...f, { id, from, to, size, endScale, t }]);
    Animated.timing(t, { toValue: 1, duration: reduceMotion ? 350 : 640, easing: Easing.out(Easing.quad), useNativeDriver: native }).start(() => {
      if (soundOn) pebbleHit((to.x / W) * 2 - 1, size);
      const pt = new Animated.Value(0);
      const pid = nextId.current++;
      setPuffs((p) => [...p, { id: pid, x: to.x, y: to.y, s: endScale, t: pt }]);
      Animated.timing(pt, { toValue: 1, duration: 900, useNativeDriver: native }).start(() => setPuffs((p) => p.filter((q) => q.id !== pid)));
      // 벽에 맞은 자리에서 아래로 떨어지며 사라짐
      Animated.timing(t, { toValue: 2, duration: 650, easing: Easing.in(Easing.quad), useNativeDriver: native }).start(() => {
        setFlights((f) => f.filter((q) => q.id !== id));
      });
      setTimeout(() => setHidden((h) => h.map((v, i) => (i === slot ? false : v))), 900);
    });
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {flights.map((f) => {
        // 살짝 위로 휘며 안쪽으로 날아감
        const mid = { x: (f.from.x + f.to.x) / 2, y: (f.from.y + f.to.y) / 2 - H * 0.05 };
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
                  { translateY: f.t.interpolate({ inputRange: [0, 0.5, 1, 2], outputRange: [f.from.y, mid.y, f.to.y, f.to.y + H * 0.06] }) },
                  { scale: f.t.interpolate({ inputRange: [0, 1, 2], outputRange: [f.size, f.endScale, f.endScale * 0.9] }) },
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
              transform: [{ scale: p.t.interpolate({ inputRange: [0, 1], outputRange: [0.3 * p.s * 2, 1.4 * p.s * 2] }) }],
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

function Pebble({ slot, x, y, size, onThrow }: { slot: number; x: number; y: number; size: number; onThrow: (slot: number, from: { x: number; y: number }, release: { x: number; y: number }) => void }) {
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
          drag.setValue({ x: 0, y: 0 });
          // 집은 곳에서 손가락을 뗀 곳 방향으로 (조금 튕긴 속도도 반영)
          onThrow(slot, { x, y }, { x: x + g.dx + g.vx * 60, y: y + g.dy + g.vy * 60 });
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
