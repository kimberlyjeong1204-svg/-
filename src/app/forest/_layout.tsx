import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { DefaultTheme, Stack, ThemeProvider, router, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ForestScene } from '../../components/forest/ForestScene';
import { ForestSpaceProvider, useForestSpace } from '../../components/forest/ForestSpace';
import { ForestSoundButton } from '../../components/forest/ForestSoundButton';
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
 * 숲 그림과 자연음은 이 레이아웃에서 한 번만 켭니다. 숲 안의 화면(숲에 머물기, 숨 고르기, 멍때리기)은
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
  const { soundOn, setSoundOn, uiOpacity, uiHidden, wakeUi } = useForestSpace();
  const reduceMotion = useReduceMotion();
  const [settings, setSettings] = useForestSoundSettings();
  const { yieldedToMusic } = useForestAmbience(soundOn, settings);
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
    if (on && !hintShown.current) {
      hintShown.current = true;
      showHint('소리가 들리지 않으면 무음 모드를 확인해 주세요.');
    }
  };

  const onBack = () => {
    if (atForestHome) goBack('/');
    else if (router.canGoBack()) router.back();
    else router.replace('/forest');
  };

  return (
    <View
      style={styles.root}
      onStartShouldSetResponderCapture={() => {
        wakeUi();
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
              onPress={() => changeSound(!soundOn)}
              accessibilityRole="switch"
              accessibilityLabel="숲 소리"
              accessibilityState={{ checked: soundOn }}
              aria-checked={soundOn}
              style={({ pressed }) => [styles.soundPill, soundOn && styles.soundPillOn, pressed && styles.pressed]}
            >
              {soundOn ? <SoundOnIcon size={20} color={FOREST_UI.ink} /> : <SoundOffIcon size={20} color={FOREST_UI.ink} />}
              <Text style={styles.soundText}>{soundOn ? '소리 끄기' : '소리 켜기'}</Text>
            </Pressable>
            <ForestSoundButton value={settings} onChange={setSettings} masterOn={soundOn} onMasterChange={changeSound} trigger="settings"
              note="숲에 머무는 동안 계속 들려요. 숲을 나가면 천천히 작아져요."
            />
          </View>
        </Animated.View>
      </SafeAreaView>

      {(hint || yieldedToMusic) && (
        <View style={styles.hintWrap} pointerEvents="none">
          <Text style={styles.hint} accessibilityLiveRegion="polite">
            {hint ?? '다른 앱 음악이 재생 중이라 숲 소리는 잠시 쉬고 있어요.'}
          </Text>
        </View>
      )}
    </View>
  );
}

const FOREST_NAV_THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent', card: 'transparent' },
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FOREST_UI.ground },
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
