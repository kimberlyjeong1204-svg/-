import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeBackdrop } from '../components/HomeBackdrop';
import { BreathIcon, CupIcon, GearIcon } from '../components/icons';
import { HIT, colors, fonts } from '../theme';

export default function Home() {
  return (
    <View style={styles.root}>
      <HomeBackdrop />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="알림 설정" style={({ pressed }) => [styles.gear, pressed && styles.pressed]}>
            <GearIcon />
          </Pressable>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title} accessibilityRole="header">
            쉼표.
          </Text>
          <Text style={styles.slogan}>{'몰입하는 일상에,\n잠깐의 여유.'}</Text>
        </View>

        <View style={styles.buttons}>
          <Pressable onPress={() => router.push('/breathe')} accessibilityRole="button" style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}>
            <BreathIcon color={colors.white} />
            <Text style={[styles.btnLabel, { color: colors.white }]}>숨 고르기</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/zone-out')} accessibilityRole="button" style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && styles.btnPressed]}>
            <CupIcon />
            <Text style={styles.btnLabel}>멍때리기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ivory },
  safe: { flex: 1 },
  topBar: { height: 56, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 20 },
  gear: { width: HIT, height: HIT, borderRadius: HIT / 2, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.5 },
  titleBlock: { marginTop: '18%', alignItems: 'center', gap: 22 },
  title: { fontFamily: fonts.display, fontSize: 60, lineHeight: 70, color: colors.text, letterSpacing: -1 },
  slogan: { fontFamily: fonts.displayRegular, fontSize: 18, lineHeight: 30, color: colors.textSoft, textAlign: 'center' },
  buttons: { marginTop: 56, paddingHorizontal: 44, gap: 16 },
  btn: {
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: colors.sageDeep,
    shadowColor: colors.sageDeep,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  btnSecondary: {
    backgroundColor: '#FBF8F1',
    borderWidth: 1,
    borderColor: colors.beige,
    shadowColor: '#786446',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  btnPressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  btnLabel: { fontSize: 18, fontWeight: '500', color: colors.text },
});
