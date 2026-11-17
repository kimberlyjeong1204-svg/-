import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { DefaultTheme, Stack, ThemeProvider, router, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ForestScene } from '../../components/forest/ForestScene';
import { ForestSpaceProvider, useForestSpace } from '../../components/forest/ForestSpace';
import { ForestSoundButton } from '../../components/forest/ForestSoundButton';
import { SoundPrompt } from '../../components/forest/SoundPrompt';
import { ForestGate } from '../../components/forest/ForestGate';
import { KEYS, isBoolean, usePersistentState } from '../../lib/storage';
import { GATE_HINGE_SFX, GATE_HINGE_VOLUME } from '../../audio/sounds';
import { playOnce } from '../../audio/sfx';
import { BackIcon, SoundOffIcon, SoundOnIcon } from '../../components/icons';
import { useReduceMotion } from '../../components/BreathCircle';
import { useForestAmbience } from '../../audio/useForestAmbience';
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
      <ForestShell />
    </ForestSpaceProvider>
  );
}

function ForestShell() {
  const { soundOn, setSoundOn, needsSoundPrompt, soundPrefReady, uiOpacity, uiHidden, wakeUi, hideUi } = useForestSpace();
  const reduceMotion = useReduceMotion();
  const [settings, setSettings] = useForestSoundSettings();

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
    if (atGate) hideUi();
  }, [atGate, hideUi]);

  // 문으로 들어올 때는 숲소리가 문이 열리는 동안 더 천천히(5초) 다가옴
  const { yieldedToMusic, status, retry } = useForestAmbience(soundOn, settings, atGate ? 5000 : 2500);
  // 「켜짐」은 실제로 소리가 나는 것이 확인됐을 때만 보여 줍니다.
  const audible = status === 'on';
  const blocked = status === 'blocked';
  const pathname = usePathname();
  const atForestHome = pathname === '/forest';

  // 소리를 처음 켤 때 한 번만: 무음 모드 안내 (웹에서는 무음 스위치 상태를 알 수 없음)
  const [hint, setHint] = useState<string | null>(null);
  const hintShown = useRef(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showHint = (text: string) => {
    setHint(text);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 4500);
  };
  const changeSound = (on: boolean) => {
    setSoundOn(on);
    // 문 앞에서 소리를 고르면 그대로 문이 열림
    openGate(on);
    if (on && !hintShown.current) {
      hintShown.current = true;
      showHint('소리가 들리지 않으면 무음 모드를 확인해 주세요.');
    }
  };

  const onSoundPress = () => {
    if (blocked) retry();
    else changeSound(!soundOn);
  };

  // 홈에서 숨 고르기·숲에 머물기로 바로 들어와도, 뒤로 가면 숲 전체 화면으로
  const onBack = () => {
    if (atForestHome) goBack('/');
    else router.dismissTo('/forest');
  };

  const soundLabel = blocked ? '눌러서 소리 켜기' : status === 'starting' ? '소리 켜는 중' : soundOn ? '소리 끄기' : '소리 켜기';

  return (
    <View
      style={styles.root}
      onStartShouldSetResponderCapture={() => {
        if (!atGate) wakeUi();
        return false;
      }}
    >
      <ForestScene reduceMotion={reduceMotion} />

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
        <Animated.View style={[styles.topBar, { opacity: uiOpacity }]} pointerEvents={uiHidden ? 'none' : 'box-none'}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={atForestHome ? '숲에서 나가기' : '숲으로 돌아가기'}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <BackIcon color={FOREST_UI.ink} />
          </Pressable>
          <View style={styles.right}>
            <Pressable
              onPress={onSoundPress}
              accessibilityRole="switch"
              accessibilityLabel="숲 소리"
              accessibilityHint={blocked ? '소리가 멈춰 있어요. 누르면 다시 켜요.' : undefined}
              accessibilityState={{ checked: audible }}
              aria-checked={audible}
              style={({ pressed }) => [styles.soundPill, audible && styles.soundPillOn, pressed && styles.pressed]}
            >
              {audible ? <SoundOnIcon size={20} color={FOREST_UI.ink} /> : <SoundOffIcon size={20} color={FOREST_UI.ink} />}
              <Text style={styles.soundText}>{soundLabel}</Text>
            </Pressable>
            <ForestSoundButton value={settings} onChange={setSettings} masterOn={soundOn} onMasterChange={changeSound} trigger="settings"
              note="숲에 머무는 동안 계속 들려요. 숲을 나가면 천천히 작아져요."
            />
          </View>
        </Animated.View>
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
            setGate('off');
          }}
        />
      )}

      {atGate ? null : blocked && !needsSoundPrompt ? (
        // 다시 방문했을 때 브라우저가 소리를 막은 경우: 눌러서 다시 켜기
        <View style={styles.hintWrap} pointerEvents="box-none">
          <Pressable onPress={retry} accessibilityRole="button" style={({ pressed }) => [styles.hintBtn, pressed && styles.pressed]}>
            <SoundOffIcon size={18} color={FOREST_UI.ink} />
            <Text style={styles.hintBtnText}>숲소리가 멈춰 있어요. 눌러서 다시 켜기</Text>
          </Pressable>
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

      {needsSoundPrompt && <SoundPrompt onChoose={changeSound} />}
    </View>
  );
}

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
  soundPill: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: FOREST_UI.glass,
  },
  soundPillOn: { backgroundColor: FOREST_UI.glassStrong },
  soundText: { ...type.small, fontSize: 14, color: FOREST_UI.ink },
  pressed: { opacity: 0.6 },
  hintWrap: { position: 'absolute', left: 0, right: 0, top: 120, alignItems: 'center', paddingHorizontal: 24 },
  hintBtn: {
    minHeight: HIT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(10, 22, 24, 0.7)',
  },
  hintBtnText: { ...type.caption, fontSize: 14, color: FOREST_UI.ink },
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
