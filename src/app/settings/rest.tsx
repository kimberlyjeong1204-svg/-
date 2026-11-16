import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../theme';

// TODO(3단계): 휴식 알림 설정 (켜기/끄기, 종류, 간격, 시간대, 요일, 반복 알림 예약)
export default function RestAlarmSettings() {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScreenHeader title="휴식 알림" backLabel="알림 설정으로" />
      <Text style={styles.text}>다음 업데이트에서 설정할 수 있어요.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ivory },
  text: { marginTop: 32, textAlign: 'center', fontSize: 14, color: colors.textMuted },
});
