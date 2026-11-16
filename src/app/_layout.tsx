import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GowunBatang_400Regular, GowunBatang_700Bold, useFonts } from '@expo-google-fonts/gowun-batang';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { registerServiceWorker } from '../lib/pwa';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
registerServiceWorker();

export default function RootLayout() {
  // 웹은 public/fonts/pretendard의 분할 글꼴(CSS)로 필요한 글자만 받습니다. 앱은 글꼴 파일을 함께 넣습니다.
  const [loaded, error] = useFonts({
    GowunBatang_400Regular,
    GowunBatang_700Bold,
    ...(Platform.OS === 'web'
      ? {}
      : {
          'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.otf'),
          'Pretendard-Medium': require('../../assets/fonts/Pretendard-Medium.otf'),
          'Pretendard-SemiBold': require('../../assets/fonts/Pretendard-SemiBold.otf'),
        }),
  });

  useEffect(() => {
    // 글꼴을 못 불러와도 시스템 글꼴로 앱이 열립니다.
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* 태블릿·PC처럼 넓은 화면에서는 휴대폰 폭으로 가운데에 보여 줍니다. */}
      <View style={styles.outer}>
        <View style={styles.inner}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.ivory },
              animation: 'fade',
            }}
          />
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Platform.OS === 'web' ? '#EFEBE2' : colors.ivory, alignItems: 'center' },
  inner: { flex: 1, width: '100%', maxWidth: 520, backgroundColor: colors.ivory, overflow: 'hidden' },
});
