import { StyleSheet, View } from 'react-native';
import { CaveScene } from './CaveScene';

/**
 * 불 가까이 보기 — iOS 앱: 아직 근접 불꽃이 없어 동굴 장면을 그대로 보여 줌(웹은 FireCloseup.web.tsx)
 */
type Props = { reduceMotion: boolean; addLog: number; onLand?: () => void };

export function FireCloseup({ reduceMotion, addLog }: Props) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <CaveScene reduceMotion={reduceMotion} flare={addLog} />
    </View>
  );
}
