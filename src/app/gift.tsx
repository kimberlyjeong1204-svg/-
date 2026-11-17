import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { HomeCover } from '../components/HomeCover';
import { FOREST_UI } from '../components/forest/forestUi';
import { ForestButton } from '../components/forest/ui';
import { fonts, type } from '../theme';

/**
 * 숲 선물 환영 화면 (/gift) — 누군가 보낸 링크로 들어왔을 때
 * 기록·알림·보낸 사람 정보 없음. 「나만의 숲으로 들어가기」를 누르면 숲 입장(처음이면 「방해금지」 문)으로.
 */
export default function Gift() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <HomeCover />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.top}>
          <Text style={styles.logo} accessibilityRole="header">
            쉼표.
          </Text>
        </View>
        <View style={styles.middle}>
          <Text style={styles.message}>{'누군가 당신에게\n작은 숲을 선물했어요'}</Text>
        </View>
        <View style={styles.actions}>
          <ForestButton label="나만의 숲으로 들어가기" variant="primary" size="lg" onPress={() => router.replace('/forest')} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FOREST_UI.ground },
  safe: { flex: 1 },
  top: { alignItems: 'center', paddingTop: 36 },
  logo: { fontFamily: fonts.display, fontSize: 40, lineHeight: 50, color: FOREST_UI.ink, letterSpacing: -1, ...FOREST_UI.textShadow },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: '45%', paddingHorizontal: 28 },
  message: { ...type.closing, fontSize: 21, lineHeight: 32, color: FOREST_UI.ink, textAlign: 'center', ...FOREST_UI.textShadow },
  actions: { paddingHorizontal: 36, paddingBottom: 40 },
});
