import { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, PanResponder, View } from 'react-native';
import { chimeHit, preloadChime } from '../../audio/chimeSound';

/**
 * 나무 풍경 (풍경 흔들기) — 쉼표 나무 풍경 자산 v1 사용
 *
 * - 상단 받침(top_cap)은 고정, 나무 조각 5개는 각자 끈 윗부분(이미지 맨 위 끈 위치)을 축으로 진자처럼 움직임
 * - 건드리거나 끌면 손가락이 지나간 조각이 그 방향·속도만큼 흔들리고 천천히 감속
 * - 이웃 조각이 실제로 닿을 때만 효과음(10개 중 무작위, 세기에 따라 작게, 동시에 4개까지)
 * - 손대지 않으면 바람에 아주 미세하게 흔들림(서로 닿지 않아 소리 없음). 동작 줄이기면 바람 없음
 * - 점수·횟수 없음
 *
 * 그림 경계: 원본 패키지의 마스크에 남아 있던 사진 배경(갈색 면)을 지우고, 받침의 V자 끈을 같은 자리에 다시 그렸습니다
 * (design/windchime/README.md, 보정 내용은 docs/ROADMAP_2.0.md). 이미지 좌표는 아래 PIECES 값.
 */
type Props = { width: number; soundOn: boolean; reduceMotion: boolean };

// 이미지 크기·끈 위치(자른 이미지 기준 px). ropeX: 맨 위 끈의 x, plankY: 판자가 시작하는 y, tilt: 원본이 기울어진 각(도)
const CAP = { src: require('../../../assets/forest/windchime/top_cap.webp'), w: 330, h: 310, ropeX: 160.4 };
const PIECES = [
  { src: require('../../../assets/forest/windchime/wood_01.webp'), w: 77, h: 514, ropeX: 36.0, plankY: 74, tilt: 0.06 },
  { src: require('../../../assets/forest/windchime/wood_02.webp'), w: 79, h: 544, ropeX: 37.6, plankY: 95, tilt: -0.13 },
  { src: require('../../../assets/forest/windchime/wood_03.webp'), w: 73, h: 463, ropeX: 31.1, plankY: 91, tilt: 1.0 },
  { src: require('../../../assets/forest/windchime/wood_04.webp'), w: 85, h: 500, ropeX: 38.9, plankY: 65, tilt: 0.33 },
  { src: require('../../../assets/forest/windchime/wood_05.webp'), w: 70, h: 463, ropeX: 25.3, plankY: 96, tilt: 1.08 },
];
const N = PIECES.length;
const CAP_SCALE = 0.5;
const PIECE_SCALE = 0.36;
const SPACING = 33; // 조각 축 사이 간격(px)
const PLANK_W = 25; // 화면에서 판자 폭(충돌 판정)
const CAP_TOP = 0;
/** 받침 아랫면(조각이 매달리는 곳)의 높이: 받침 이미지 아래쪽 판 가운데 */
const HANG_Y = CAP_TOP + CAP.h * CAP_SCALE - 26;

export function WindChime({ width, soundOn, reduceMotion }: Props) {
  const angles = useRef(PIECES.map(() => new Animated.Value(0))).current;
  const sim = useRef({ th: new Array(N).fill(0) as number[], w: new Array(N).fill(0) as number[], lastHit: new Array(N).fill(0) as number[] }).current;
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;
  const cx = width / 2;
  const pivots = useMemo(() => PIECES.map((_, i) => cx + (i - (N - 1) / 2) * SPACING), [cx]);
  // 조각마다: 축에서 무게중심·충돌점까지 거리(px)
  const geo = useMemo(
    () =>
      PIECES.map((p) => {
        const len = p.h * PIECE_SCALE;
        const plankTop = p.plankY * PIECE_SCALE;
        // 충돌 판정은 판자 위쪽·아래쪽 두 점에서 (세게 흔들어도 서로 통과하지 않게)
        return { len, com: (plankTop + len) / 2, hits: [plankTop + (len - plankTop) * 0.35, len - 6] };
      }),
    [],
  );

  // 풍경 흔들기를 열면 효과음을 미리 불러 둠
  useEffect(() => {
    if (soundOn) void preloadChime();
  }, [soundOn]);

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
        const L = geo[i].com / 100; // 진자 길이(긴 조각일수록 느리게)
        const wind = reduceRef.current ? 0 : 0.045 * Math.sin(t * 0.55 + i * 1.3) + 0.025 * Math.sin(t * 1.6 + i * 0.7);
        const acc = -(9.8 / L) * Math.sin(th[i]) * 0.5 - 0.6 * w[i] + wind;
        w[i] += acc * dt;
        th[i] += w[i] * dt;
        if (Math.abs(th[i]) > 0.55) {
          th[i] = Math.sign(th[i]) * 0.55;
          w[i] *= -0.3;
        }
      }
      // 이웃 조각이 닿는지: 두 번 반복해 겹침을 확실히 풀고, 처음 닿는 순간에만 소리
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < N - 1; i++) {
          let worst = 0, ha = 0, hb = 0, xa = 0, xb = 0;
          for (let k = 0; k < 2; k++) {
            const ra = geo[i].hits[k], rb = geo[i + 1].hits[k];
            const pa = pivots[i] + ra * Math.sin(th[i]);
            const pb = pivots[i + 1] + rb * Math.sin(th[i + 1]);
            const ov = PLANK_W - (pb - pa);
            if (ov > worst) {
              worst = ov; ha = ra; hb = rb; xa = pa; xb = pb;
            }
          }
          if (worst <= 0) continue;
          th[i] -= (worst / 2 / ha) * 1.0;
          th[i + 1] += (worst / 2 / hb) * 1.0;
          const va = w[i] * ha, vb = w[i + 1] * hb;
          const closing = va - vb;
          if (closing <= 0) continue;
          const e = 0.45; // 나무라 많이 튀지 않음
          const na = (va + vb - e * closing) / 2, nb = (va + vb + e * closing) / 2;
          w[i] = na / ha;
          w[i + 1] = nb / hb;
          if (pass === 0 && closing > 12 && now - sim.lastHit[i] > 80) {
            sim.lastHit[i] = now;
            if (soundRef.current) chimeHit(i, Math.min(1, closing / 200), ((xa + xb) / 2 / Math.max(1, width)) * 2 - 1);
          }
        }
      }
      for (let i = 0; i < N; i++) angles[i].setValue(th[i]);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [angles, geo, pivots, sim, width]);

  // 건드리기·끌기: 손가락이 지나가는 높이에서 가까운 조각을 손가락 방향·속도만큼 밀기
  const responder = useMemo(() => {
    const push = (x: number, y: number, v: number) => {
      for (let i = 0; i < N; i++) {
        const r = Math.max(10, Math.min(geo[i].len, y - HANG_Y));
        const px = pivots[i] + r * Math.sin(sim.th[i]);
        const d = Math.abs(x - px);
        if (d < 30 && y > HANG_Y && y < HANG_Y + geo[i].len + 20) sim.w[i] += (v * (1 - d / 30) * 70) / Math.max(40, r);
      }
    };
    let sx = 0, sy = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        sx = e.nativeEvent.locationX;
        sy = e.nativeEvent.locationY;
        // 살짝 건드림: 누른 쪽에서 반대쪽으로 가볍게
        push(sx, sy, sx < cx ? 1.4 : -1.4);
      },
      onPanResponderMove: (_e, g) => push(sx + g.dx, sy + g.dy, Math.max(-5, Math.min(5, g.vx * 3))),
    });
  }, [cx, geo, pivots, sim]);

  const height = HANG_Y + Math.max(...geo.map((g) => g.len)) + 24;
  return (
    <View
      {...responder.panHandlers}
      style={{ width, height }}
      accessibilityRole="adjustable"
      accessibilityLabel="나무 풍경. 건드리거나 끌면 흔들려요"
      testID="wind-chime"
    >
      {PIECES.map((p, i) => {
        const w = p.w * PIECE_SCALE, h = p.h * PIECE_SCALE, ox = p.ropeX * PIECE_SCALE;
        const rest = (-p.tilt * Math.PI) / 180; // 원본의 기울기를 바로 세움
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: pivots[i] - ox,
              top: HANG_Y,
              width: w,
              height: h,
              transformOrigin: `${ox}px 0px`,
              transform: [{ rotate: angles[i].interpolate({ inputRange: [-1, 1], outputRange: [`${rest - 1}rad`, `${rest + 1}rad`] }) }],
            }}
          >
            {/* 웹에서는 크기를 꼭 적어야 원본 크기로 커지지 않음 */}
            <Image source={p.src} style={{ width: w, height: h }} />
          </Animated.View>
        );
      })}
      {/* 받침은 조각 위에 그려 끈 윗부분이 받침 아래로 들어가 보이게 */}
      <Image
        pointerEvents="none"
        source={CAP.src}
        style={{ position: 'absolute', left: cx - CAP.ropeX * CAP_SCALE, top: CAP_TOP, width: CAP.w * CAP_SCALE, height: CAP.h * CAP_SCALE }}
      />
    </View>
  );
}
