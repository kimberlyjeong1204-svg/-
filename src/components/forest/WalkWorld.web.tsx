import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForestSpace } from './ForestSpace';
import { FOREST_TEXT, ForestButton, ForestChoiceGroup } from './ui';
import { KEYS, isOneOf, usePersistentState } from '../../lib/storage';
import { WindChime } from './WindChime';
import { forestImages } from './forestConfig';
import { useReduceMotion } from '../BreathCircle';
import { goHome } from '../../lib/navigation';
import { setWalkMix, startSteps, stopSteps, stopWalk, type WalkMix } from '../../audio/walkSound';

/**
 * 숲 거닐기 — 1인칭 3D 숲길 (웹, three.js) · **회색 상자(그레이박스) 시제품**
 *
 * 숲길 → 폭포 → 큰 나무 아래가 한 공간에 이어져 있고, 손가락으로 실제로 걸어갑니다.
 * - 조작: 화면을 누른 채 위로 밀면 앞으로(많이 밀수록 빠르게), 좌우로 밀면 방향, 손을 떼면 0.3초 안에 멈춤
 * - 카메라: 눈높이 1.6m, 시선을 아주 조금 아래로(길 바닥이 화면 아래 약 절반). 흔들림·줌·흐림·페이드 없음
 * - 전진감: 가까운 낙엽·돌·덤불, 중간 나무, 먼 나무가 거리만큼 다르게 지나감(실제 3D 원근·시차)
 * - 장소: 폭포 앞·큰 나무 아래에 가까워지면 천천히 멈춤 → 「잠시 앉기」(눈높이 1.05m로 낮아짐) → 「일어나기」
 * - 충돌: 길 가장자리, 나무 둥치, 앉을 바위·벤치, 큰 나무 둥치는 지나갈 수 없음
 * - 소리: 걷는 동안만 발소리. 폭포·새·잎소리는 실제 거리에 따라 계속 변함(숲 기본 자연음은 그대로)
 * - 길 끝: 동굴 입구(바위 사이 어두운 입구와 장작불 빛) 앞에서 멈춤 → 「돌아가기」(뒤로 돌아 왔던 길을 걸음) ·
 *   「동굴 들어가기」 · 「숲 나가기」(홈). 돌아와 시작점에 닿으면 「다시 걷기」 · 「숲 나가기」
 * - 아래로 밀면 천천히 뒷걸음(방향은 그대로), 「돌아가기」는 몸을 돌려 반대로 걷기 — 둘은 다름
 * - 「나가기」로 언제든 숲·홈으로. 많이 걸은 뒤 위쪽 뒤로 가기를 누르면 「산책을 마칠까요?」 확인(걷던 자리는 기억하지 않음)
 * - 다시 들어오면 늘 시작점에서 새 산책
 * 그림(나무·바위·폭포·길)은 코드로 만든 단순한 형태라 숲의 사실적인 화풍과 다릅니다. 최종 3D 자산으로 교체 예정.
 * iOS 앱은 장면 이어 보기(WalkScenes)를 씀.
 */

const PATH_LEN = 136;
const START_S = 2;
const END_S = 119; // 동굴 입구 앞에서 멈추는 곳
const CAVE_S = 130; // 동굴 입구
const PATH_HALF = 1.15; // 걸을 수 있는 길 폭의 절반(m)
const EYE = 1.6;
const SIT_EYE = 1.05;
const MAX_SPEED = 2.2; // m/s
const PITCH = -0.05; // 시선을 아주 조금 아래로

/** 길 가운데선 (s: 길을 따라 간 거리, m) */
const pathX = (s: number) => 2.6 * Math.sin(s * 0.045) + 1.2 * Math.sin(s * 0.11 + 1);
const pathAngle = (s: number) => Math.atan(pathX(s + 0.5) - pathX(s - 0.5)); // 진행 방향이 -z에서 x쪽으로 기운 각

type PlaceId = 'waterfall' | 'tree';
const PLACES: Record<PlaceId, { stopS: number; side: 1 | -1 }> = {
  waterfall: { stopS: 60, side: 1 },
  tree: { stopS: 108, side: -1 },
};

type Spot = PlaceId | 'end' | 'start';
type WorldState = { s: number; lat: number; yaw: number; speed: number; arrived: Spot | null; sitting: boolean; eye: number; dir: 1 | -1; face: number };
type WorldApi = { dispose: () => void; turnAround: () => void; state: () => WorldState; setMood: (m: Mood) => void };

/** 걷는 시간(밝기): 밤 · 새벽. 바꾸면 약 1.5초에 걸쳐 빛·안개가 바뀜 */
export type Mood = 'night' | 'dawn';
export const MOODS: readonly Mood[] = ['night', 'dawn'];
type MoodLook = { exposure: number; sky: number; ground: number; hemi: number; key: number; keyInt: number; keyPos: [number, number, number]; fog: number; fogDensity: number; flies: number };
const LOOK: Record<Mood, MoodLook> = {
  // 밤: 달빛 숲(예전보다 조금 밝게)
  night: { exposure: 1.45, sky: 0x8fb0bc, ground: 0x1e2a1f, hemi: 1.8, key: 0xa9c4d4, keyInt: 1.1, keyPos: [-20, 40, 10], fog: 0x10252b, fogDensity: 0.03, flies: 1 },
  // 새벽: 옅은 푸른 안개, 앞쪽 낮은 곳에서 들어오는 따뜻한 빛
  dawn: { exposure: 1.7, sky: 0xdfe8ee, ground: 0x4d4a3c, hemi: 2.4, key: 0xffd6ae, keyInt: 1.7, keyPos: [25, 14, -70], fog: 0x9db2b8, fogDensity: 0.024, flies: 0.25 },
};

export function WalkWorld() {
  const { uiOpacity, uiHidden, wakeUi, setHideDelay, soundOn, soundStatus, setLeaveGuard, setAutoHide } = useForestSpace();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const audible = soundOn && soundStatus === 'on';
  const boxRef = useRef<any>(null); // 웹에서는 div
  const [arrived, setArrived] = useState<Spot | null>(null);
  // 걷는 시간(밝기): 밤 · 새벽, 기기에 기억
  const [mood, setMood] = usePersistentState<Mood>(KEYS.walkLight, 'dawn', isOneOf(MOODS));
  const moodRef = useRef(mood);
  moodRef.current = mood;
  const [exitOpen, setExitOpen] = useState(false);
  const api = useRef<WorldApi | null>(null);
  const [sitting, setSitting] = useState(false);
  const [moved, setMoved] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const audibleRef = useRef(audible);
  audibleRef.current = audible;
  const sittingRef = useRef(false);
  sittingRef.current = sitting;
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;

  useFocusEffect(
    useCallback(() => {
      setHideDelay(5000);
      wakeUi();
      return () => setHideDelay(4000);
    }, [setHideDelay, wakeUi]),
  );
  // 위쪽 뒤로 가기: 많이 걸었으면 바로 나가지 않고 확인 (걷던 자리는 기억하지 않음)
  const exitRef = useRef(exitOpen);
  exitRef.current = exitOpen;
  useFocusEffect(
    useCallback(() => {
      setLeaveGuard(() => {
        if (exitRef.current) {
          setExitOpen(false);
          return false;
        }
        const st = api.current?.state();
        if (st && (st.s > START_S + 5 || st.dir < 0)) {
          setExitOpen(true);
          return false;
        }
        return true;
      });
      return () => setLeaveGuard(null);
    }, [setLeaveGuard]),
  );
  // 고르는 창이 떠 있는 동안에는 메뉴가 숨지 않음
  const choosing = exitOpen || arrived === 'end' || arrived === 'start';
  useEffect(() => {
    setAutoHide(!choosing);
    if (choosing) wakeUi();
    return () => setAutoHide(true);
  }, [choosing, setAutoHide, wakeUi]);
  useEffect(() => () => stopWalk(1200), []);
  useEffect(() => {
    if (!audible) stopWalk(600);
  }, [audible]);

  useEffect(() => {
    const host = boxRef.current as unknown as HTMLDivElement | null;
    if (!host) return;
    let alive = true;
    let cleanup = () => {};
    // WebGL을 쓸 수 없는 기기(데스크톱 Chrome 하드웨어 가속 꺼짐 등)는 3D를 불러오지 않고 바로 숲 그림으로
    if (!webglAvailable()) {
      setFailed(true);
      return;
    }
    import('three')
      .then((THREE) => {
        if (!alive) return;
        const a = buildWorld(THREE, host, {
          onArrive: (p) => {
            setArrived(p);
            wakeUi();
          },
          onMoveStart: () => setMoved(true),
          isSitting: () => sittingRef.current,
          isAudible: () => audibleRef.current,
          reduce: () => reduceRef.current,
          onLost: () => setFailed(true),
          mood: moodRef.current,
        });
        api.current = a;
        cleanup = a.dispose;
        setReady(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      cleanup();
      api.current = null;
    };
    // 한 번만 만듦
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.current?.setMood(mood);
  }, [mood, ready]);

  const sit = (on: boolean) => {
    setSitting(on);
    (window as unknown as { __shimpyoWorldSit?: (on: boolean) => void }).__shimpyoWorldSit?.(on);
    wakeUi();
  };

  return (
    <View style={[styles.root, { backgroundColor: mood === 'dawn' ? '#9db2b8' : '#10252b' }]}>
      <View ref={boxRef} style={StyleSheet.absoluteFill} />
      {!ready && !failed && <View style={[StyleSheet.absoluteFill, { backgroundColor: mood === 'dawn' ? '#9db2b8' : '#10252b' }]} pointerEvents="none" />}
      {failed && (
        // 3D를 열 수 없으면: 걷는 법·조작은 숨기고 숲 그림과 돌아가는 버튼만
        <View style={StyleSheet.absoluteFill}>
          <Image source={forestImages.background} style={styles.failImage} resizeMode="cover" accessibilityIgnoresInvertColors />
          <SafeAreaView style={styles.failWrap} edges={['bottom']}>
            <View style={styles.failCard}>
              <Text style={[FOREST_TEXT.cue, styles.sheetText]}>이 기기에서는 3D 숲길을 열 수 없어요.</Text>
              <ForestButton label="숲으로 돌아가기" variant="solid" size="sm" onPress={() => router.dismissTo('/forest')} />
            </View>
          </SafeAreaView>
        </View>
      )}

      {arrived === 'tree' && (
        <View style={styles.chime} pointerEvents="box-none">
          <WindChime width={width} soundOn={audible} reduceMotion={reduceMotion} anchorX={0.7} />
        </View>
      )}

      {!failed && (
      <SafeAreaView style={styles.safe} edges={['bottom']} pointerEvents="box-none">
        <View style={styles.spacer} pointerEvents="none" />
        <Animated.View style={[styles.bottom, { opacity: uiOpacity }]} pointerEvents={uiHidden ? 'none' : 'box-none'}>
          {arrived === 'end' && (
            <View style={styles.row}>
              <ForestButton label="돌아가기" variant="solid" size="sm" onPress={() => api.current?.turnAround()} accessibilityHint="몸을 돌려 왔던 숲길을 거꾸로 걸어요" />
              <ForestButton label="동굴 들어가기" variant="solid" size="sm" onPress={() => router.replace('/forest/cave')} />
              <ForestButton label="숲 나가기" variant="solid" size="sm" onPress={goHome} accessibilityHint="홈으로 가요" />
            </View>
          )}
          {arrived === 'start' && (
            <View style={styles.row}>
              <ForestButton label="다시 걷기" variant="solid" size="sm" onPress={() => api.current?.turnAround()} />
              <ForestButton label="숲 나가기" variant="solid" size="sm" onPress={goHome} accessibilityHint="홈으로 가요" />
            </View>
          )}
          {(arrived === 'waterfall' || arrived === 'tree') &&
            (sitting ? <ForestButton label="일어나기" variant="solid" onPress={() => sit(false)} /> : <ForestButton label="잠시 앉기" variant="solid" onPress={() => sit(true)} />)}
          {!moved && !arrived && <Text style={FOREST_TEXT.caption}>화면을 누른 채 위로 밀면 걸어요 · 좌우로 밀면 방향을 바꿔요</Text>}
          <ForestChoiceGroup label="걷는 시간" showLabel={false} align="center" options={[{ value: 'night' as Mood, label: '밤' }, { value: 'dawn' as Mood, label: '새벽' }]} value={mood} onChange={setMood} />
          {arrived !== 'end' && arrived !== 'start' && <ForestButton label="나가기" variant="quiet" size="sm" onPress={() => setExitOpen(true)} />}
        </Animated.View>
      </SafeAreaView>
      )}

      {exitOpen && (
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <View style={styles.sheet} accessibilityRole="alert">
            <Text style={[FOREST_TEXT.cue, styles.sheetText]}>산책을 마칠까요?{'\n'}걷던 자리는 기억되지 않아요.</Text>
            <ForestButton label="숲으로 돌아가기" variant="solid" size="sm" onPress={() => router.dismissTo('/forest')} />
            <ForestButton label="홈으로 나가기" variant="solid" size="sm" onPress={goHome} />
            <ForestButton label="계속 걷기" variant="quiet" size="sm" onPress={() => setExitOpen(false)} />
          </View>
        </View>
      )}
    </View>
  );
}

type Hooks = {
  mood: Mood;
  onArrive: (p: Spot | null) => void;
  onMoveStart: () => void;
  isSitting: () => boolean;
  isAudible: () => boolean;
  reduce: () => boolean;
  /** 3D 화면이 끊김(WebGL context lost) */
  onLost: () => void;
};

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

// ─── 3D 세계 ─────────────────────────────────────────────

function canvasTex(THREE: typeof import('three'), w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat: [number, number]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

let seed = 7;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

function buildWorld(THREE: typeof import('three'), host: HTMLDivElement, hooks: Hooks): WorldApi {
  seed = 7;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const look0 = LOOK[hooks.mood];
  renderer.toneMappingExposure = look0.exposure;
  const canvas = renderer.domElement;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    hooks.onLost();
  });
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block';
  canvas.setAttribute('aria-label', '3D 숲길. 화면을 누른 채 위로 밀면 걸어요');
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const fogColor = new THREE.Color(look0.fog);
  scene.background = fogColor;
  const fog = new THREE.FogExp2(fogColor, look0.fogDensity);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(62, 1, 0.08, 120);

  const hemi = new THREE.HemisphereLight(look0.sky, look0.ground, look0.hemi);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(look0.key, look0.keyInt);
  moon.position.set(...look0.keyPos);
  scene.add(moon);
  // 밤 ↔ 새벽: 목표 모습으로 천천히 옮겨 감
  let moodTarget: MoodLook = look0;
  const cur = { ...look0, skyC: new THREE.Color(look0.sky), groundC: new THREE.Color(look0.ground), keyC: new THREE.Color(look0.key), fogC: new THREE.Color(look0.fog), pos: new THREE.Vector3(...look0.keyPos) };
  const tmpC = new THREE.Color();
  const tmpV = new THREE.Vector3();
  const stepMood = (dt: number) => {
    const k = Math.min(1, dt * 2);
    cur.exposure += (moodTarget.exposure - cur.exposure) * k;
    cur.hemi += (moodTarget.hemi - cur.hemi) * k;
    cur.keyInt += (moodTarget.keyInt - cur.keyInt) * k;
    cur.fogDensity += (moodTarget.fogDensity - cur.fogDensity) * k;
    cur.flies += (moodTarget.flies - cur.flies) * k;
    cur.skyC.lerp(tmpC.set(moodTarget.sky), k);
    cur.groundC.lerp(tmpC.set(moodTarget.ground), k);
    cur.keyC.lerp(tmpC.set(moodTarget.key), k);
    cur.fogC.lerp(tmpC.set(moodTarget.fog), k);
    cur.pos.lerp(tmpV.set(...moodTarget.keyPos), k);
    renderer.toneMappingExposure = cur.exposure;
    hemi.color.copy(cur.skyC);
    hemi.groundColor.copy(cur.groundC);
    hemi.intensity = cur.hemi;
    moon.color.copy(cur.keyC);
    moon.intensity = cur.keyInt;
    moon.position.copy(cur.pos);
    fogColor.copy(cur.fogC);
    fog.color.copy(cur.fogC);
    fog.density = cur.fogDensity;
  };
  const setMood = (m: Mood) => {
    moodTarget = LOOK[m];
  };

  const world = (s: number, lat: number) => {
    const a = pathAngle(s);
    return new THREE.Vector3(pathX(s) + Math.cos(a) * lat, 0, -s + Math.sin(a) * lat);
  };

  // 땅: 이끼·흙
  const groundTex = canvasTex(THREE, 256, 256, (g) => {
    g.fillStyle = '#1b2418';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const v = 18 + Math.floor(rnd() * 26);
      g.fillStyle = `rgba(${v + 8},${v + 16},${v},0.6)`;
      g.fillRect(rnd() * 256, rnd() * 256, 2 + rnd() * 3, 2 + rnd() * 3);
    }
  }, [60, 80]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 300), new THREE.MeshLambertMaterial({ map: groundTex }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -PATH_LEN / 2);
  scene.add(ground);

  // 길: 가운데선을 따라 띠를 만들고 흙·낙엽 무늬 (멀리 갈수록 좁아 보이는 원근은 실제 3D)
  const pathTex = canvasTex(THREE, 256, 256, (g) => {
    g.fillStyle = '#4a3b2c';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const hue = rnd();
      g.fillStyle = hue < 0.55 ? `rgba(${110 + rnd() * 60},${55 + rnd() * 30},${20 + rnd() * 15},0.85)` : `rgba(${60 + rnd() * 30},${48 + rnd() * 20},${34},0.8)`;
      g.save();
      g.translate(rnd() * 256, rnd() * 256);
      g.rotate(rnd() * 6.3);
      g.beginPath();
      g.ellipse(0, 0, 3 + rnd() * 5, 1.5 + rnd() * 2, 0, 0, 6.3);
      g.fill();
      g.restore();
    }
  }, [1, 1]);
  {
    const seg = 260, W = PATH_HALF + 0.35;
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let i = 0; i <= seg; i++) {
      const s = (i / seg) * PATH_LEN;
      const a = pathAngle(s);
      const cx = pathX(s);
      const wob = 0.15 * Math.sin(s * 0.7);
      for (const side of [-1, 1]) {
        pos.push(cx + Math.cos(a) * side * (W + wob), 0.01, -s);
        uv.push(side < 0 ? 0 : 1.2, s / 2.4);
      }
      if (i < seg) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: pathTex })));
  }

  const dummy = new THREE.Object3D();
  const obstacles: { x: number; z: number; r: number }[] = [];
  const clear = (x: number, z: number) => {
    // 폭포 앞·큰 나무 아래 빈터
    const w = world(PLACES.waterfall.stopS + 6, 0), t = world(PLACES.tree.stopS + 3, 0);
    const cv = world(CAVE_S, 0);
    return Math.hypot(x - (w.x + 6), z - w.z) > 9 && Math.hypot(x - (t.x - 3), z - t.z) > 7 && Math.hypot(x - cv.x, z - cv.z) > 7;
  };

  // 나무: 둥치(나무껍질 무늬) + 어두운 잎 덩어리. 길에서 멀수록 많이
  const barkTex = canvasTex(THREE, 64, 256, (g) => {
    g.fillStyle = '#2b2620';
    g.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(${15 + rnd() * 30},${14 + rnd() * 26},${12 + rnd() * 18},0.7)`;
      g.fillRect(rnd() * 64, rnd() * 256, 1 + rnd() * 3, 10 + rnd() * 40);
    }
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(${50 + rnd() * 30},${80 + rnd() * 40},${50},0.35)`;
      g.fillRect(rnd() * 64, 160 + rnd() * 96, 3 + rnd() * 6, 3 + rnd() * 10);
    }
  }, [2, 3]);
  const trunks: { x: number; z: number; r: number; h: number }[] = [];
  for (let i = 0; i < 360; i++) {
    const s = rnd() * (PATH_LEN + 20) - 5;
    const side = rnd() < 0.5 ? -1 : 1;
    const d = 2.4 + Math.pow(rnd(), 1.6) * 34;
    const x = pathX(s) + side * d, z = -s;
    if (!clear(x, z)) continue;
    const r = 0.18 + rnd() * 0.45;
    if (d < PATH_HALF + r + 1.1) continue; // 길 위·바로 옆에는 나무를 두지 않음
    trunks.push({ x, z, r, h: 9 + rnd() * 8 });
    if (d < 4) obstacles.push({ x, z, r: r + 0.35 });
  }
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.75, 1, 1, 9), new THREE.MeshLambertMaterial({ map: barkTex }), trunks.length);
  const crownMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0x1a2c22, flatShading: true }), trunks.length);
  trunks.forEach((t, i) => {
    dummy.position.set(t.x, t.h / 2, t.z);
    dummy.rotation.set(0, rnd() * 6.3, 0);
    dummy.scale.set(t.r, t.h, t.r);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);
    dummy.position.set(t.x + (rnd() - 0.5), t.h * 0.95, t.z + (rnd() - 0.5));
    const cs = 2.2 + rnd() * 2.5;
    dummy.scale.set(cs, cs * 0.8, cs);
    dummy.updateMatrix();
    crownMesh.setMatrixAt(i, dummy.matrix);
  });
  scene.add(trunkMesh, crownMesh);

  // 가까운 덤불·고사리, 돌, 낙엽 (가까울수록 빨리 지나가는 시차)
  const bushes = new THREE.InstancedMesh(new THREE.ConeGeometry(0.5, 0.7, 6), new THREE.MeshLambertMaterial({ color: 0x24402c, flatShading: true }), 500);
  const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0x4d5250, flatShading: true }), 300);
  const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.12, 0.07), new THREE.MeshLambertMaterial({ color: 0x8a4a1f, side: THREE.DoubleSide }), 1400);
  const leafColor = new THREE.Color();
  for (let i = 0; i < 500; i++) {
    const s = rnd() * PATH_LEN, side = rnd() < 0.5 ? -1 : 1, d = PATH_HALF + 0.4 + rnd() * 5;
    const x = pathX(s) + side * d;
    dummy.position.set(x, 0.2, -s);
    const k = 0.5 + rnd() * 0.9;
    dummy.scale.set(k, k * (0.6 + rnd() * 0.6), k);
    dummy.rotation.set(0, rnd() * 6.3, 0);
    dummy.updateMatrix();
    bushes.setMatrixAt(i, dummy.matrix);
  }
  for (let i = 0; i < 300; i++) {
    const s = rnd() * PATH_LEN, side = rnd() < 0.5 ? -1 : 1, d = PATH_HALF * (0.4 + rnd() * 1.4);
    dummy.position.set(pathX(s) + side * d, 0.02, -s);
    const k = 0.05 + Math.pow(rnd(), 3) * 0.3;
    dummy.scale.set(k * (1 + rnd()), k * 0.6, k);
    dummy.rotation.set(rnd(), rnd() * 6.3, rnd());
    dummy.updateMatrix();
    stones.setMatrixAt(i, dummy.matrix);
  }
  for (let i = 0; i < 1400; i++) {
    const s = rnd() * PATH_LEN, d = (rnd() - 0.5) * 2 * (PATH_HALF + 0.8);
    dummy.position.set(pathX(s) + d, 0.015, -s);
    dummy.rotation.set(-Math.PI / 2, 0, rnd() * 6.3);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
    leafColor.setHSL(0.06 + rnd() * 0.05, 0.42, 0.16 + rnd() * 0.12);
    leaves.setColorAt(i, leafColor);
  }
  scene.add(bushes, stones, leaves);

  // 폭포: 바위 절벽 + 흐르는 물(셰이더) + 물웅덩이 + 물안개, 앞에 앉을 수 있는 평평한 바위
  const wf = world(PLACES.waterfall.stopS + 6, 0);
  const wfX = wf.x + 6.5, wfZ = wf.z;
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x3b423f, flatShading: true });
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), rockMat);
    m.position.set(wfX + (rnd() - 0.5) * 9, 1 + rnd() * 6, wfZ - 2.5 - rnd() * 2);
    m.scale.set(2 + rnd() * 2.5, 2 + rnd() * 3, 1.5 + rnd());
    scene.add(m);
  }
  const waterUniforms = { t: { value: 0 } };
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 8.5, 1, 1),
    new THREE.ShaderMaterial({
      uniforms: waterUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: 'varying vec2 v; void main(){ v=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec2 v; uniform float t;
        float h(vec2 p){return fract(sin(dot(p,vec2(12.9,78.2)))*43758.5);}
        void main(){ float x=v.x; float y=v.y+t*0.9;
          float st=0.; for(int i=0;i<3;i++){ float f=float(i+1)*7.; st+=0.33*smoothstep(0.55,1.,sin(x*f*6.28+h(vec2(floor(x*f*3.),0.))*6.)*0.5+0.5+sin(y*f*1.7)*0.25); }
          float edge=smoothstep(0.,0.15,x)*smoothstep(1.,0.85,x);
          vec3 c=mix(vec3(0.35,0.55,0.6),vec3(0.85,0.95,0.97),st);
          gl_FragColor=vec4(c,(0.45+0.5*st)*edge); }`,
    }),
  );
  water.position.set(wfX, 4.25, wfZ - 1.2);
  water.lookAt(wfX - 6.5, 4.25, wfZ);
  scene.add(water);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24), new THREE.MeshLambertMaterial({ color: 0x163a40, transparent: true, opacity: 0.92 }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(wfX - 0.8, 0.02, wfZ + 0.3);
  scene.add(pool);
  obstacles.push({ x: wfX - 0.8, z: wfZ + 0.3, r: 3.4 });
  const mistTex = canvasTex(THREE, 64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(200,225,230,0.55)');
    gr.addColorStop(1, 'rgba(200,225,230,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  }, [1, 1]);
  const mists: import('three').Sprite[] = [];
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.5 }));
    sp.position.set(wfX - 1 + (rnd() - 0.5) * 3, 0.6 + rnd(), wfZ + (rnd() - 0.5) * 2);
    sp.scale.setScalar(2.5 + rnd() * 2);
    scene.add(sp);
    mists.push(sp);
  }
  const seatRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0x4a5448, flatShading: true }));
  const sr = world(PLACES.waterfall.stopS + 1.2, PATH_HALF + 0.9);
  seatRock.position.set(sr.x, 0.18, sr.z);
  seatRock.scale.set(0.75, 0.3, 0.6);
  scene.add(seatRock);
  obstacles.push({ x: sr.x, z: sr.z, r: 0.75 });

  // 큰 나무: 굵은 둥치·뿌리·넓은 잎 덩어리, 아래에 낮은 나무 벤치
  const bt = world(PLACES.tree.stopS + 4, 0);
  const btX = bt.x - 4.4, btZ = bt.z;
  const big = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.1, 14, 14), new THREE.MeshLambertMaterial({ map: barkTex }));
  big.position.set(btX, 7, btZ);
  scene.add(big);
  for (let i = 0; i < 6; i++) {
    const root = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3.2, 6), new THREE.MeshLambertMaterial({ map: barkTex }));
    const a = (i / 6) * 6.3;
    root.position.set(btX + Math.cos(a) * 2.2, 0.3, btZ + Math.sin(a) * 2.2);
    root.rotation.set(Math.sin(a) * 1.3, 0, -Math.cos(a) * 1.3);
    scene.add(root);
  }
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0x223a2a, flatShading: true }));
    c.position.set(btX + (rnd() - 0.3) * 9, 12 + rnd() * 3, btZ + (rnd() - 0.5) * 8);
    c.scale.set(4 + rnd() * 2, 2.5 + rnd(), 4 + rnd() * 2);
    scene.add(c);
  }
  obstacles.push({ x: btX, z: btZ, r: 2.4 });
  const wood = new THREE.MeshLambertMaterial({ color: 0x5a4330 });
  const bench = new THREE.Group();
  const seatTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.42), wood);
  seatTop.position.y = 0.45;
  bench.add(seatTop);
  for (const dx of [-0.6, 0.6]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.45, 8), wood);
    leg.position.set(dx, 0.22, 0);
    bench.add(leg);
  }
  const bp = world(PLACES.tree.stopS + 1.4, PATH_HALF + 0.85);
  bench.position.set(bp.x, 0, bp.z);
  bench.rotation.y = 0.3;
  scene.add(bench);
  obstacles.push({ x: bp.x, z: bp.z, r: 0.85 });

  // 반딧불이
  const flyGeo = new THREE.BufferGeometry();
  const flyN = 90, flyPos = new Float32Array(flyN * 3), flyBase = new Float32Array(flyN * 3);
  for (let i = 0; i < flyN; i++) {
    const s = rnd() * PATH_LEN;
    flyBase.set([pathX(s) + (rnd() - 0.5) * 14, 0.6 + rnd() * 2.5, -s], i * 3);
  }
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  const flyTex = canvasTex(THREE, 32, 32, (g) => {
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,245,170,1)');
    gr.addColorStop(0.3, 'rgba(240,230,120,0.5)');
    gr.addColorStop(1, 'rgba(240,230,120,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 32, 32);
  }, [1, 1]);
  const flyMat = new THREE.PointsMaterial({ size: 0.18, map: flyTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const flies = new THREE.Points(flyGeo, flyMat);
  scene.add(flies);

  // 길 끝 동굴 입구: 바위 더미 사이 어두운 입구, 안쪽에서 장작불 빛이 일렁임
  const cv = world(CAVE_S, 0);
  const caveRock = new THREE.MeshLambertMaterial({ color: 0x3a3f3b, flatShading: true });
  const caveGroup = new THREE.Group();
  caveGroup.position.set(cv.x, 0, cv.z);
  caveGroup.rotation.y = -pathAngle(CAVE_S);
  scene.add(caveGroup);
  const rockAt = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), caveRock);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rnd(), rnd() * 6, rnd());
    caveGroup.add(m);
  };
  // 좌우 기둥 바위, 위를 덮는 큰 바위, 뒤쪽 산처럼 쌓인 바위
  rockAt(-2.6, 1.6, 0, 1.6, 2.4, 1.6);
  rockAt(-3.8, 0.9, -0.6, 1.4, 1.6, 1.5);
  rockAt(2.6, 1.7, 0, 1.7, 2.5, 1.6);
  rockAt(3.9, 1.0, -0.5, 1.5, 1.7, 1.4);
  rockAt(0, 4.1, -0.3, 3.6, 1.5, 1.9);
  rockAt(-1.4, 5.4, -1.6, 3, 2, 2.4);
  rockAt(1.8, 5.6, -1.8, 3.2, 2.2, 2.3);
  for (let i = 0; i < 6; i++) rockAt((rnd() - 0.5) * 12, 2 + rnd() * 5, -3 - rnd() * 3, 3 + rnd() * 2, 2.5 + rnd() * 2, 2.5);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0x050403 }));
  mouth.scale.set(1.7, 2.3, 1);
  mouth.position.set(0, 1.3, -0.4);
  caveGroup.add(mouth);
  const emberTex = canvasTex(THREE, 64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,170,80,0.9)');
    gr.addColorStop(0.4, 'rgba(230,110,40,0.35)');
    gr.addColorStop(1, 'rgba(200,80,20,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  }, [1, 1]);
  const caveGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: emberTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  caveGlow.position.set(0, 0.9, -0.9);
  caveGlow.scale.set(1.8, 1.6, 1);
  caveGroup.add(caveGlow);
  const caveLight = new THREE.PointLight(0xff8a3c, 6, 9, 1.6);
  caveLight.position.set(0, 1.0, 0.6);
  caveGroup.add(caveLight);

  // ─── 걷기 ───
  const st: WorldState = { s: START_S, lat: 0, yaw: 0, speed: 0, arrived: null, sitting: false, eye: EYE, dir: 1, face: 0 };
  let target = 0; // 목표 속도(손가락)
  let held = false, sx = 0, sy = 0, lastX = 0, startYaw = 0;
  let lockUntilRelease = false;
  const passed: Record<PlaceId, boolean> = { waterfall: false, tree: false };
  let movedOnce = false;

  const onDown = (e: PointerEvent) => {
    if (hooks.isSitting()) return;
    held = true;
    sx = lastX = e.clientX;
    sy = e.clientY;
    startYaw = st.yaw;
    canvas.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!held || lockUntilRelease) return;
    const dy = sy - e.clientY;
    target = Math.max(-0.35, Math.min(1, dy / 140)) * MAX_SPEED;
    st.yaw = Math.max(-1.1, Math.min(1.1, startYaw - (e.clientX - sx) * 0.004));
    lastX = e.clientX;
    if (!movedOnce && Math.abs(dy) > 20) {
      movedOnce = true;
      hooks.onMoveStart();
    }
  };
  const onUp = () => {
    held = false;
    target = 0;
    lockUntilRelease = false;
  };
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  void lastX;

  const collide = (s: number, lat: number) => {
    const p = world(s, lat);
    for (const o of obstacles) if (Math.hypot(p.x - o.x, p.z - o.z) < o.r + 0.25) return true;
    return false;
  };

  // 자동 점검용(브라우저 테스트): 상태 읽기·위치 옮기기·앉기
  const w = window as unknown as Record<string, unknown>;
  w.__shimpyoWorld = () => ({ ...st });
  w.__shimpyoWorldTeleport = (s: number) => {
    st.s = s;
    st.lat = 0;
    st.yaw = 0;
    st.dir = 1;
    st.face = 0;
    st.arrived = null;
    passed.waterfall = s > PLACES.waterfall.stopS + 0.5;
    passed.tree = s > PLACES.tree.stopS + 0.5;
  };
  w.__shimpyoWorldSit = (on: boolean) => {
    st.sitting = on;
  };

  let blocked = false;
  let turn: { from: number; to: number; t: number } | null = null;
  // 돌아서기(돌아가기·다시 걷기): 몸을 천천히 반 바퀴 돌림
  let about: { from: number; to: number; yaw0: number; t: number } | null = null;
  const turnAround = () => {
    if (about) return;
    st.dir = st.dir === 1 ? -1 : 1;
    st.arrived = null;
    st.sitting = false;
    turn = null;
    about = { from: st.face, to: st.dir === 1 ? 0 : Math.PI, yaw0: st.yaw, t: 0 };
    hooks.onArrive(null);
  };
  w.__shimpyoWorldTurn = turnAround;
  let last = performance.now();
  let raf = 0;
  let mixTimer = 0;
  let lastMix: WalkMix | null = null;
  const resize = () => {
    const r = host.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = Math.max(1, r.width) / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    // 속도: 손을 떼면 0.3초 안에 멈춤
    let want = st.sitting ? 0 : target;
    // 장소에 가까워지면 자연스럽게 멈춤
    for (const id of ['waterfall', 'tree'] as PlaceId[]) {
      const pl = PLACES[id];
      if (st.dir < 0) break; // 돌아가는 길에는 장소에서 멈추지 않음
      if (passed[id]) {
        if (st.s < pl.stopS - 8) passed[id] = false;
        continue;
      }
      if (st.s > pl.stopS - 5 && st.s < pl.stopS && want > 0) want = Math.min(want, Math.max(0.6, (pl.stopS - st.s) * 0.6));
      if ((st.s >= pl.stopS - 0.05 || (blocked && st.s > pl.stopS - 3)) && st.arrived !== id) {
        st.arrived = id;
        passed[id] = true;
        st.speed = 0;
        want = 0;
        target = 0;
        lockUntilRelease = held;
        // 장소(폭포·큰 나무) 쪽으로 천천히 몸을 돌림 (시선 회전만, 확대 없음)
        const here = world(st.s, st.lat);
        const look = id === 'waterfall' ? { x: wfX, z: wfZ } : { x: btX, z: btZ };
        const face = Math.atan2(-(look.x - here.x), -(look.z - here.z)) + pathAngle(st.s);
        turn = { from: st.yaw, to: Math.max(-1.1, Math.min(1.1, face * (id === 'tree' ? 0.5 : 1))), t: 0 };
        hooks.onArrive(id);
      }
    }
    // 길 끝(동굴 입구)·시작점: 가까워지면 천천히, 닿으면 멈추고 고르기
    const endS = st.dir > 0 ? END_S : START_S;
    const toEnd = (endS - st.s) * st.dir;
    if (want > 0 && toEnd < 5) want = Math.min(want, Math.max(0.6, toEnd * 0.6));
    if (toEnd <= 0.05 && st.arrived !== (st.dir > 0 ? 'end' : 'start') && !about) {
      st.arrived = st.dir > 0 ? 'end' : 'start';
      st.speed = 0;
      want = 0;
      target = 0;
      lockUntilRelease = held;
      if (st.dir > 0) turn = { from: st.yaw, to: 0, t: 0 }; // 동굴 입구를 바라봄
      hooks.onArrive(st.arrived);
    }
    if (about) want = 0;
    // 가속은 부드럽게, 손을 떼면 일정하게 감속(최고 속도에서 약 0.3초)
    if (want === 0) {
      const dec = 8 * dt;
      st.speed = Math.abs(st.speed) <= dec ? 0 : st.speed - Math.sign(st.speed) * dec;
    } else st.speed += (want - st.speed) * Math.min(1, dt * 3);
    const ns = Math.max(START_S, Math.min(END_S, st.s + st.speed * Math.cos(st.yaw) * dt * st.dir));
    const nl = Math.max(-PATH_HALF, Math.min(PATH_HALF, st.lat + st.speed * Math.sin(-st.yaw) * dt * st.dir));
    if (!collide(ns, nl)) {
      st.s = ns;
      st.lat = nl;
    } else if (!collide(ns, st.lat)) st.s = ns;
    else {
      st.speed = 0;
      blocked = want > 0;
    }
    if (st.speed !== 0) blocked = false;
    const spotS = st.arrived === 'end' ? END_S : st.arrived === 'start' ? START_S : st.arrived ? PLACES[st.arrived].stopS : 0;
    if (st.arrived && Math.abs(st.s - spotS) > 1.5) {
      st.arrived = null;
      hooks.onArrive(null);
    }

    if (turn) {
      if (held && !lockUntilRelease) turn = null;
      else {
        turn.t = Math.min(1, turn.t + dt / 1.6);
        const e = turn.t * turn.t * (3 - 2 * turn.t);
        st.yaw = turn.from + (turn.to - turn.from) * e;
        if (turn.t >= 1) turn = null;
      }
    }
    if (about) {
      about.t = Math.min(1, about.t + dt / 1.5);
      const e = about.t * about.t * (3 - 2 * about.t);
      st.face = about.from + (about.to - about.from) * e;
      st.yaw = about.yaw0 * (1 - e);
      if (about.t >= 1) about = null;
    }
    // 눈높이(앉기)
    st.eye += ((st.sitting ? SIT_EYE : EYE) - st.eye) * Math.min(1, dt * 4);

    // 카메라: 진행 방향 + 시선 회전, 흔들림 없음
    const p = world(st.s, st.lat);
    const heading = -pathAngle(st.s) + st.yaw + st.face;
    camera.position.set(p.x, st.eye, p.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(PITCH, heading, 0);

    // 소리: 걷는 동안만 발소리, 장소 소리는 거리로
    if (hooks.isAudible()) {
      if (Math.abs(st.speed) > 0.25) startSteps('leaves');
      else stopSteps();
      mixTimer += dt;
      if (mixTimer > 0.25) {
        mixTimer = 0;
        const dW = Math.hypot(p.x - wfX, p.z - wfZ), dT = Math.hypot(p.x - btX, p.z - btZ);
        const near = Math.max(0, Math.min(1, 1 - (dW - 5) / 24));
        const mix: WalkMix = {
          waterNear: near,
          waterFar: Math.max(0, Math.min(1, 1 - (dW - 10) / 90)) * (1 - near * 0.6),
          leaves: 0.35 + 0.65 * Math.max(0, Math.min(1, 1 - (dT - 4) / 30)),
          birdsNear: Math.max(0, Math.min(1, 1 - (dT - 4) / 26)),
          birdsFar: 0.55,
        };
        if (!lastMix || (Object.keys(mix) as (keyof WalkMix)[]).some((k) => Math.abs(mix[k] - lastMix![k]) > 0.02)) {
          setWalkMix(mix, 400);
          lastMix = mix;
        }
      }
    } else {
      stopSteps();
      lastMix = null;
    }

    // 살아 있는 것: 물 흐름·물안개·반딧불이 (카메라는 그대로)
    const t = now / 1000;
    waterUniforms.t.value = t;
    caveLight.intensity = 5 + 1.6 * Math.sin(t * 2.3) + 0.8 * Math.sin(t * 5.7 + 1);
    stepMood(dt);
    flyMat.opacity = cur.flies;
    mists.forEach((m, i) => {
      m.position.y = 0.7 + 0.25 * Math.sin(t * 0.3 + i);
    });
    const reduce = hooks.reduce();
    for (let i = 0; i < flyN; i++) {
      const bx = flyBase[i * 3], by = flyBase[i * 3 + 1], bz = flyBase[i * 3 + 2];
      flyPos[i * 3] = bx + (reduce ? 0 : Math.sin(t * 0.3 + i) * 0.6);
      flyPos[i * 3 + 1] = by + (reduce ? 0 : Math.sin(t * 0.5 + i * 1.7) * 0.3);
      flyPos[i * 3 + 2] = bz + (reduce ? 0 : Math.cos(t * 0.25 + i) * 0.6);
    }
    flyGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  const dispose = () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    canvas.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    stopSteps();
    scene.traverse((o) => {
      const m = o as import('three').Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as import('three').Material | import('three').Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose?.();
    });
    renderer.dispose();
    canvas.remove();
    delete w.__shimpyoWorld;
    delete w.__shimpyoWorldTeleport;
    delete w.__shimpyoWorldSit;
    delete w.__shimpyoWorldTurn;
  };
  return { dispose, turnAround, state: () => st, setMood };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1c21' },
  loading: { backgroundColor: '#0b1c21' },
  safe: { flex: 1 },
  spacer: { flex: 1 },
  bottom: { alignItems: 'center', gap: 10, paddingBottom: 28, paddingHorizontal: 16 },
  chime: { position: 'absolute', top: 0, left: 0, right: 0 },
  failImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  failWrap: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  failCard: { width: '100%', maxWidth: 320, padding: 20, gap: 12, borderRadius: 20, backgroundColor: 'rgba(14, 18, 20, 0.82)', alignItems: 'stretch' },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  sheetWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  sheet: { width: '100%', maxWidth: 320, padding: 22, gap: 10, borderRadius: 20, backgroundColor: 'rgba(14, 18, 20, 0.9)', alignItems: 'stretch' },
  sheetText: { textAlign: 'center', marginBottom: 6 },
});
