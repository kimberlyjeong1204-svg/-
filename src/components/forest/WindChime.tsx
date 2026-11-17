import { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Line, Rect, Stop } from 'react-native-svg';
import { chimeHit } from '../../audio/chimeSound';

/**
 * 나무 풍경 (풍경 흔들기)
 *
 * 나뭇가지에서 내려온 줄에 나무 조각 다섯 개가 매달려 있습니다. 각 조각은 진자처럼 움직입니다.
 * - 손으로 건드리거나 끌면 그 방향·세기만큼 흔들리고, 천천히 감속하며 멈춤
 * - 이웃한 조각이 부딪히면 세기에 맞는 부드러운 나무 소리
 * - 가만히 두면 바람에 아주 조금 흔들림(이때는 서로 닿지 않아 소리 없음)
 * - 점수·횟수 없음
 *
 * 그림: 지금은 코드로 그린 **임시 모양**(어두운 나무색 + 청록 빛)입니다. 최종 풍경 그림(조각별 투명 PNG)을 받으면
 * Piece의 그림만 바꾸면 되고, 움직임·소리는 그대로 씁니다. 사양은 docs/WORK_STATUS.md 참고.
 */
type Props = { width: number; soundOn: boolean; reduceMotion: boolean };

const N = 5;
const LENGTHS = [128, 112, 96, 108, 88]; // 조각 길이(px): 길수록 낮은 소리
const SOUND_ORDER = [0, 1, 3, 2, 4]; // 길이 순서대로 음높이
const STRING = [34, 40, 46, 38, 50]; // 줄 길이
const GAP = 22; // 조각 사이 간격
const PIECE_W = 13;
const TOP = 46; // 위쪽 나무 받침까지 내려온 줄 길이

export function WindChime({ width, soundOn, reduceMotion }: Props) {
  const angles = useRef(LENGTHS.map(() => new Animated.Value(0))).current;
  const sim = useRef({ th: new Array(N).fill(0) as number[], w: new Array(N).fill(0) as number[], lastHit: new Array(N).fill(0) as number[] }).current;
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const cx = width / 2;
  const pivots = useMemo(() => LENGTHS.map((_, i) => cx + (i - (N - 1) / 2) * GAP), [cx]);

  useEffect(() => {
    let raf = 0;
    let last = Date.now();
    const step = () => {
      raf = requestAnimationFrame(step);
      const now = Date.now();
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const { th, w } = sim;
      const t = now / 1000;
      for (let i = 0; i < N; i++) {
        const L = (STRING[i] + LENGTHS[i]) / 100; // 진자 길이(임의 단위)
        // 바람: 아주 약하고 느리게, 조각마다 조금 다르게
        const wind = reduceMotion ? 0 : 0.05 * Math.sin(t * 0.6 + i * 1.3) + 0.03 * Math.sin(t * 1.7 + i * 0.7);
        const acc = -(9.8 / L) * Math.sin(th[i]) * 0.55 - 0.55 * w[i] + wind;
        w[i] += acc * dt;
        th[i] += w[i] * dt;
        th[i] = Math.max(-0.8, Math.min(0.8, th[i]));
        if (Math.abs(th[i]) >= 0.8) w[i] *= 0.3;
      }
      // 이웃 조각끼리 부딪힘 (조각 아래쪽 위치 기준)
      for (let i = 0; i < N - 1; i++) {
        const la = STRING[i] + LENGTHS[i] * 0.7, lb = STRING[i + 1] + LENGTHS[i + 1] * 0.7;
        const xa = pivots[i] + la * Math.sin(th[i]), xb = pivots[i + 1] + lb * Math.sin(th[i + 1]);
        const overlap = PIECE_W - (xb - xa);
        if (overlap <= 0) continue;
        const va = w[i] * la, vb = w[i + 1] * lb;
        const closing = va - vb;
        // 겹친 만큼 떼어 놓기
        th[i] -= (overlap / 2 / la) * 0.9;
        th[i + 1] += (overlap / 2 / lb) * 0.9;
        if (closing <= 0) continue;
        // 속도를 주고받음(조금 잃음)
        const e = 0.55;
        const na = (va + vb - e * closing) / 2, nb = (va + vb + e * closing) / 2;
        w[i] = na / la;
        w[i + 1] = nb / lb;
        if (closing > 14 && now - sim.lastHit[i] > 90) {
          sim.lastHit[i] = now;
          if (soundRef.current) chimeHit(SOUND_ORDER[closing > 60 ? i : i + 1], Math.min(1, closing / 220), ((xa + xb) / 2 / Math.max(1, width)) * 2 - 1);
        }
      }
      for (let i = 0; i < N; i++) angles[i].setValue(th[i]);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [angles, pivots, reduceMotion, sim, width]);

  // 건드리기·끌기: 손가락 가까이의 조각을 손가락이 움직이는 쪽으로 밀기
  const responder = useMemo(() => {
    const push = (x: number, v: number) => {
      for (let i = 0; i < N; i++) {
        const l = STRING[i] + LENGTHS[i] * 0.7;
        const px = pivots[i] + l * Math.sin(sim.th[i]);
        const d = Math.abs(x - px);
        if (d < 34) sim.w[i] += v * (1 - d / 34);
      }
    };
    let startX = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        // 살짝 건드림: 누른 쪽에서 반대쪽으로 가볍게
        startX = e.nativeEvent.locationX;
        push(startX, startX < cx ? 1.6 : -1.6);
      },
      // 끌기: 손가락이 지나가는 조각을 움직이는 방향·속도만큼 밀기
      onPanResponderMove: (_e, g) => push(startX + g.dx, Math.max(-5, Math.min(5, g.vx * 3))),
    });
  }, [cx, pivots, sim]);

  const height = TOP + 60 + Math.max(...LENGTHS) + 40;
  return (
    <View
      {...responder.panHandlers}
      style={{ width, height }}
      accessibilityRole="adjustable"
      accessibilityLabel="나무 풍경. 건드리거나 끌면 흔들려요"
      testID="wind-chime"
    >
      {/* 나뭇가지에서 내려온 줄과 나무 받침 */}
      <Svg width={width} height={TOP + 14} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="chimeTop" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#4A4034" />
            <Stop offset="1" stopColor="#1B1611" />
          </LinearGradient>
        </Defs>
        <Line x1={cx} y1={0} x2={cx} y2={TOP} stroke="#2A251E" strokeWidth={1.4} />
        <Ellipse cx={cx} cy={TOP + 4} rx={(N * GAP) / 2 + 6} ry={6} fill="url(#chimeTop)" />
        <Ellipse cx={cx - 8} cy={TOP + 2} rx={(N * GAP) / 2 - 8} ry={2} fill="#8FB8B4" opacity={0.18} />
      </Svg>
      {LENGTHS.map((len, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: pivots[i] - 12,
            top: TOP + 6,
            width: 24,
            height: STRING[i] + len,
            transformOrigin: 'top center',
            transform: [{ rotate: angles[i].interpolate({ inputRange: [-1.2, 1.2], outputRange: ['-1.2rad', '1.2rad'] }) }],
          }}
        >
          <Piece string={STRING[i]} length={len} id={i} />
        </Animated.View>
      ))}
    </View>
  );
}

/** 조각 하나(줄 + 나무 조각). 최종 그림을 받으면 이 부분만 Image로 바꿉니다. */
function Piece({ string, length, id }: { string: number; length: number; id: number }) {
  return (
    <Svg width={24} height={string + length}>
      <Defs>
        <LinearGradient id={`wood${id}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#6E8F8C" stopOpacity={0.55} />
          <Stop offset="0.16" stopColor="#4B4034" />
          <Stop offset="0.6" stopColor="#2B241C" />
          <Stop offset="1" stopColor="#14110D" />
        </LinearGradient>
      </Defs>
      <Line x1={12} y1={0} x2={12} y2={string} stroke="#2A251E" strokeWidth={1.1} />
      <Rect x={12 - PIECE_W / 2} y={string} width={PIECE_W} height={length} rx={PIECE_W / 2.6} fill={`url(#wood${id})`} />
      {/* 나뭇결과 위쪽 마디 */}
      <Line x1={10} y1={string + 10} x2={10} y2={string + length - 10} stroke="#0E0C09" strokeOpacity={0.35} strokeWidth={0.6} />
      <Rect x={12 - PIECE_W / 2} y={string + 6} width={PIECE_W} height={1.2} fill="#0E0C09" opacity={0.4} />
    </Svg>
  );
}
