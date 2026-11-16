import { Platform, StyleSheet, Text } from 'react-native';
import { colors, type } from '../theme';

/**
 * 알림을 실제로 보낼 수 있는지 솔직하게 안내합니다.
 * - 웹앱: 서버 없이 예약 알림을 보낼 수 없어 설정만 저장합니다.
 * - iOS 앱: 알림 예약은 3단계에서 연결합니다.
 */
export function AlarmNote() {
  const text =
    Platform.OS === 'web'
      ? '웹앱에서는 아직 알림을 보낼 수 없어요. 고른 설정은 이 기기에 저장돼요.'
      : '알림 보내기는 다음 업데이트에서 연결돼요. 고른 설정은 이 기기에 저장돼요.';
  return <Text style={styles.note}>{text}</Text>;
}

const styles = StyleSheet.create({
  note: { marginHorizontal: 4, ...type.caption, color: colors.textMuted },
});
