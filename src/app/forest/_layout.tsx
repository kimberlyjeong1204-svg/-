import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { DefaultTheme, Stack, ThemeProvider, router, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ForestScene } from '../../components/forest/ForestScene';
import { ForestSpaceProvider, useForestSpace } from '../../components/forest/ForestSpace';
import { StayTimerProvider } from '../../components/forest/StayTimer';
import { ForestSoundButton } from '../../components/forest/ForestSoundButton';
import { SoundPrompt } from '../../components/forest/SoundPrompt';
import { FOREST_TEXT, ForestButton } from '../../components/forest/ui';
import { ForestGate } from '../../components/forest/ForestGate';
import { KEYS, isBoolean, usePersistentState } from '../../lib/storage';
import { setCaveFireVolume } from '../../audio/caveSound';
import { GATE_HINGE_SFX, GATE_HINGE_VOLUME } from '../../audio/sounds';
import { playOnce } from '../../audio/sfx';
import { BackIcon, RainIcon, SoundOffIcon, SoundOnIcon } from '../../components/icons';
import { useReduceMotion } from '../../components/BreathCircle';
import { useForestAmbience } from '../../audio/useForestAmbience';
import { useForestRain } from '../../audio/useForestRain';
import { useForestSoundSettings } from '../../audio/useForestSound';
import { goBack } from '../../lib/navigation';
import { FOREST_UI } from '../../components/forest/forestUi';
import { HIT, radius, type } from '../../theme';

/**
 * 나의 숲 (공통 숲 공간)
 *
 * 숲 그림과 자연음은 이 레이아웃에서 한 번만 켭니다. 숲 안의 화면(숲 전체 화면, 숨 고르기, 숲에 머물기)은
 * 그 위에 투명하게 겹쳐지므로, 활동을 바꿔도 그림과 소리가 끊기지 않습니다.
 */
export default function ForestLayout() {
  return (
    <ForestSpaceProvider>
      <StayTimerProvider>
        <ForestShell />
      </StayTimerProvider>
    </ForestSpaceProvider>
  );
}

function ForestShell() {
  const { soundOn, setSoundOn, needsSoundPrompt, soundPrefReady, uiOpacity, uiHidden, wakeUi, hideUi, forestHold, weather, setWeather, breatheAudio, onForestTouch, reportSound, setUiSuppressed, runLeaveGuard } = useForestSpace();
  const raining = weather === 'rain';
  const pathname = usePathname();
  // 동굴 안: 숲 그림은 쉬고, 숲소리는 아주 작게(장작불 소리가 이어 받음), 비 소리는 멀어짐
  const inCave = pathname === '/forest/cave';
  const [caveRamp, setCaveRamp] = useState(false);
  const prevCave = useRef(inCave);
  useEffect(() => {
    if (prevCave.current === inCave) return;
    prevCave.current = inCave;
    setCaveRamp(true);
    const t = setTimeout(() => setCaveRamp(false), 3500);
    return () => clearTimeout(t);
  }, [inCave]);
  const reduceMotion = useReduceMotion();
  const [settings, setSettings] = useForestSoundSettings();
  // 동굴 환경음: 동굴 안에서 실제로 조절되는 소리는 장작불(숲소리는 동굴에서 아주 작게만 들림)
  const [caveFire, setCaveFire] = usePersistentState<CaveFireSetting>(KEYS.caveFire, { volume: 1, muted: false }, isCaveFire);
  useEffect(() => {
    setCaveFireVolume(caveFire.muted ? 0 : caveFire.volume);
  }, [caveFire]);
  // 비가 오면 귀뚜라미·풀벌레를 절반쯤 낮춤(바람은 그대로). 비가 그치면 원래대로
  const playSettings = useMemo(
    () => {
      const bugs = settings.volume.forestBugs * (raining ? RAIN_BUGS_DUCK : 1) * (inCave ? CAVE_DUCK : 1);
      const wind = settings.volume.forestWind * (inCave ? CAVE_DUCK : 1);
      return raining || inCave ? { ...settings, volume: { ...settings.volume, forestBugs: bugs, forestWind: wind } } : settings;
    },
    [settings, raining, inCave],
  );

  // 숲 입구: 처음 방문(또는 설정의 「숲 입구 다시 보기」) 때만. 다시 올 때는 숲으로 바로
  const [gateSeen, setGateSeen, gateReady] = usePersistentState<boolean>(KEYS.forestGateSeen, false, isBoolean);
  const [gate, setGate] = useState<'pending' | 'show' | 'opening' | 'off'>('pending');
  useEffect(() => {
    if (gate === 'pending' && gateReady) setGate(gateSeen ? 'off' : 'show');
  }, [gate, gateReady, gateSeen]);
  const atGate = gate === 'show' || gate === 'opening';

  // 문 열기: 경첩 소리는 문이 열릴 때 딱 한 번 (소리를 켠 경우만). 숲소리는 그대로 이어짐
  const hingePlayed = useRef(false);
  const openGate = (withSound: boolean) => {
    if (gate !== 'show') return;
    setGate('opening');
    if (withSound && !reduceMotion && GATE_HINGE_SFX != null && !hingePlayed.current) {
      hingePlayed.current = true;
      playOnce(GATE_HINGE_SFX, GATE_HINGE_VOLUME);
    }
  };
  // 입구에 있는 동안 숲 메뉴는 숨겨 두고, 도착한 뒤에도 숨긴 채로 시작 (화면을 누르면 나타남)
  useEffect(() => {
    setUiSuppressed(atGate || gate === 'pending');
    if (atGate || gate === 'pending') hideUi();
  }, [atGate, gate, hideUi, setUiSuppressed]);

  // 문으로 들어올 때는 숲소리가 문이 열리는 동안 더 천천히(5초) 다가옴
  const { yieldedToMusic, status, retry } = useForestAmbience(soundOn, playSettings, atGate ? 5000 : 2500, forestHold, caveRamp ? 3000 : 300);
  useForestRain(weather, soundOn && !inCave, breatheAudio, yieldedToMusic);
  useEffect(() => {
    reportSound(status, retry);
  }, [status, retry, reportSound]);
  // 「켜짐」은 실제로 소리가 나는 것이 확인됐을 때만 보여 줍니다.
  const audible = status === 'on';
  const blocked = status === 'blocked';
  // 「내 음악과 함께」로 잠시 쉬는 중: 사용자가 끈 것이 아니므로 「켜기」 버튼을 고정하지 않음
  const held = status === 'held';
  const atForestHome = pathname === '/forest';

  // 위쪽 버튼으로 소리를 처음 켤 때 한 번만: 무음 모드 안내 (웹에서는 무음 스위치 상태를 알 수 없음)
  // 입구 안내창에서 이미 「숲소리 켜고 들어가기」를 골랐다면 숲 안에서 같은 안내를 반복하지 않음
  const [hint, setHint] = useState<string | null>(null);
  const hintShown = useRef(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showHint = (text: string) => {
    setHint(text);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 4500);
  };
  const changeSound = (on: boolean, from: 'prompt' | 'button' = 'button') => {
    setSoundOn(on);
    // 문 앞에서 소리를 고르면 그대로 문이 열림
    openGate(on);
    if (from === 'prompt') {
      // 입구에서 「숲소리 켜고 들어가기」를 골랐으면 숲 안에서 다시 안내하지 않음
      if (on) hintShown.current = true;
      return;
    }
    if (on && !hintShown.current) {
      hintShown.current = true;
      showHint('소리가 들리지 않으면 무음 모드를 확인해 주세요.');
    }
  };

  const toggleRain = () => {
    const next = !raining;
    setWeather(next ? 'rain' : 'clear');
    showHint(next ? '비가 천천히 내려요.' : '비가 천천히 그쳐요.');
  };

  const onSoundPress = () => {
    if (blocked) retry();
    else changeSound(!soundOn);
  };

  // 홈에서 숨 고르기·숲에 머물기로 바로 들어와도, 뒤로 가면 숲 전체 화면으로
  const onBack = () => {
    // 산책 중 확인창·불 가까이 보기 닫기처럼 화면이 먼저 처리할 일이 있으면 그쪽에 맡김
    if (!runLeaveGuard()) return;
    if (atForestHome) goBack('/');
    else router.dismissTo('/forest');
  };

  /**
   * 숲소리 버튼 네 가지 상태
   * - 꺼짐: 「숲소리 켜기」 (메뉴가 숨어도 사라지지 않음)
   * - 켜는 중: 「켜는 중」 (실제 소리가 확인될 때까지 켜짐으로 보이지 않음, 사라지지 않음)
   * - 켜짐: 작은 아이콘만. 다른 메뉴와 함께 4초 뒤 숨음
   * - 막힘(Safari 재생 차단): 「눌러서 숲소리 켜기」 (사라지지 않음, 누르는 순간 다시 재생)
   */
  const soundLabel = blocked ? '눌러서 숲소리 켜기' : status === 'starting' ? '켜는 중' : '숲소리 켜기';
  const soundPinned = !audible && !held; // 켜짐(또는 잠시 쉼)이 아니면 늘 보임
  // 막 켜졌을 때: 버튼이 갑자기 사라지지 않도록 메뉴를 잠깐 보였다가 함께 천천히 숨김
  useEffect(() => {
    if (audible && !atGate) wakeUi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audible]);

  return (
    <View
      style={styles.root}
      onStartShouldSetResponderCapture={() => {
        if (!atGate) wakeUi();
        return false;
      }}
    >
      <StatusBar style="light" />
      <ForestScene reduceMotion={reduceMotion} rain={raining} paused={inCave || (Platform.OS === 'web' && pathname === '/forest/stay')} registerTouch={onForestTouch} caveGlow />

      {/* 숲 안의 화면들은 배경이 투명해야 뒤의 숲이 보입니다(기본 테마의 회색 배경을 끔) */}
      <View style={StyleSheet.absoluteFill}>
        <ThemeProvider value={FOREST_NAV_THEME}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
              animation: 'fade',
            }}
          />
        </ThemeProvider>
      </View>

      <SafeAreaView edges={['top']} style={styles.topWrap} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <Animated.View style={{ opacity: uiOpacity }} pointerEvents={uiHidden ? 'none' : 'box-none'}>
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel={atForestHome ? '숲에서 나가기' : inCave ? '동굴에서 나가기' : '숲으로 돌아가기'}
              accessibilityHint={atForestHome ? '홈으로 가요' : '나의 숲 첫 화면으로 가요'}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            >
              <BackIcon color={FOREST_UI.ink} />
            </Pressable>
          </Animated.View>
          <View style={styles.right} pointerEvents="box-none">
            {/* Rain Mode: 숲의 날씨. 숨 고르기·숲에 머물기 중에도 그대로, 기기에 저장 */}
            {!inCave && (
            <Animated.View style={{ opacity: uiOpacity }} pointerEvents={uiHidden ? 'none' : 'box-none'}>
              <ForestButton
                size="icon"
                checked={raining}
                variant={raining ? 'strong' : 'glass'}
                onPress={toggleRain}
                accessibilityLabel="비"
                accessibilityHint={raining ? '누르면 비가 천천히 그쳐요' : '누르면 숲에 잔잔한 비가 내려요'}
                icon={<RainIcon size={20} color={FOREST_UI.ink} />}
              />
            </Animated.View>
            )}
            <Animated.View style={{ opacity: soundPinned ? 1 : uiOpacity }} pointerEvents={!soundPinned && uiHidden ? 'none' : 'box-none'}>
              <ForestButton
                onPress={onSoundPress}
                checked={audible}
                accessibilityLabel="숲 소리"
                accessibilityHint={blocked ? 'Safari가 소리를 멈췄어요. 누르면 다시 켜요.' : audible ? '누르면 숲소리를 꺼요' : undefined}
                size={audible || held ? 'icon' : 'sm'}
                variant={blocked ? 'warn' : 'glass'}
                icon={audible ? <SoundOnIcon size={20} color={FOREST_UI.ink} /> : <SoundOffIcon size={20} color={FOREST_UI.ink} />}
                label={audible || held ? undefined : soundLabel}
              />
            </Animated.View>
            {/* 음량 세부 조절은 소리가 켜져 있을 때만, 다른 메뉴와 함께 숨음 */}
            {audible && (
              <Animated.View style={{ opacity: uiOpacity }} pointerEvents={uiHidden ? 'none' : 'box-none'}>
                {inCave ? (
                  <ForestSoundButton
                    value={settings}
                    onChange={setSettings}
                    masterOn={soundOn}
                    onMasterChange={(on) => changeSound(on)}
                    trigger="settings"
                    title="동굴 소리"
                    tracks={[{ key: 'fire', label: '장작불', volume: caveFire.volume, muted: caveFire.muted }]}
                    onTrack={(_k, patch) => setCaveFire({ volume: patch.volume ?? caveFire.volume, muted: patch.muted ?? caveFire.muted })}
                    note="장작불 소리는 조약돌·종이·장작 넣기 소리와 함께 커지고 작아져요. 숲소리는 동굴 밖에서 조절해요. 위쪽 스피커를 끄면 모든 소리가 꺼져요."
                  />
                ) : (
                  <ForestSoundButton value={settings} onChange={setSettings} masterOn={soundOn} onMasterChange={(on) => changeSound(on)} trigger="settings"
                    note="숲에 머무는 동안 계속 들려요. 위쪽 스피커를 끄면 숲소리·빗소리·걷는 소리·풍경·동굴 소리가 모두 꺼져요."
                  />
                )}
              </Animated.View>
            )}
          </View>
        </View>
      </SafeAreaView>

      {gate === 'pending' && <View style={[StyleSheet.absoluteFill, styles.cover]} />}
      {atGate && (
        <ForestGate
          opening={gate === 'opening'}
          reduceMotion={reduceMotion}
          showTapHint={soundPrefReady && !needsSoundPrompt}
          onRequestOpen={soundPrefReady && !needsSoundPrompt ? () => openGate(soundOn) : undefined}
          onDone={() => {
            setGateSeen(true);
            setUiSuppressed(false);
            setGate('off');
            // 숲에 도착하면 할 수 있는 것(숨 고르기·숲에 머물기·동굴 가기)을 잠깐 보여 줌
            setTimeout(wakeUi, 400);
          }}
        />
      )}

      {atGate ? null : blocked && !needsSoundPrompt ? (
        // Safari가 재생을 막은 경우: 위쪽 버튼을 누르면 다시 재생 (설명만 짧게)
        <View style={styles.blockedNoteWrap} pointerEvents="none">
          <Text style={[FOREST_TEXT.caption, styles.blockedNote]} accessibilityLiveRegion="polite">
            Safari가 숲소리를 잠시 멈췄어요
          </Text>
        </View>
      ) : (
        (hint || yieldedToMusic) && (
          <View style={styles.hintWrap} pointerEvents="none">
            <Text style={styles.hint} accessibilityLiveRegion="polite">
              {hint ?? '다른 앱 음악이 재생 중이라 숲 소리는 잠시 쉬고 있어요.'}
            </Text>
          </View>
        )
      )}

      {needsSoundPrompt && <SoundPrompt onChoose={(on) => changeSound(on, 'prompt')} />}
    </View>
  );
}

/** 비가 올 때 귀뚜라미·풀벌레 음량 비율 */
const RAIN_BUGS_DUCK = 0.5;
/** 동굴 안에서 숲소리 음량 비율 (멀리서 아주 작게) */
const CAVE_DUCK = 0.12;

type CaveFireSetting = { volume: number; muted: boolean };
const isCaveFire = (v: unknown): v is CaveFireSetting =>
  typeof v === 'object' && v != null && typeof (v as CaveFireSetting).volume === 'number' && typeof (v as CaveFireSetting).muted === 'boolean';

const FOREST_NAV_THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent', card: 'transparent' },
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FOREST_UI.ground },
  cover: { backgroundColor: FOREST_UI.ground },
  topWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: { height: 56, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { width: HIT, height: HIT, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  blockedNoteWrap: { position: 'absolute', top: 104, right: 16, left: 16, alignItems: 'flex-end' },
  blockedNote: { textAlign: 'right' },
  pressed: { opacity: 0.6 },
  hintWrap: { position: 'absolute', left: 0, right: 0, top: 120, alignItems: 'center', paddingHorizontal: 24 },
  hint: {
    ...type.caption,
    color: FOREST_UI.ink,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(10, 22, 24, 0.55)',
    overflow: 'hidden',
  },
});
