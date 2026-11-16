import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GowunBatang_400Regular, GowunBatang_700Bold, useFonts } from '@expo-google-fonts/gowun-batang';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({ GowunBatang_400Regular, GowunBatang_700Bold });

  useEffect(() => {
    // 글꼴을 못 불러와도 시스템 글꼴로 앱이 열립니다.
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.ivory },
          animation: 'fade',
        }}
      />
    </SafeAreaProvider>
  );
}
