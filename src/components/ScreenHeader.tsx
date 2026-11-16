import type { ReactNode } from 'react';
import type { Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BackIcon } from './icons';
import { HIT, colors, type } from '../theme';
import { goBack } from '../lib/navigation';

type Props = {
  title: string;
  backLabel?: string;
  right?: ReactNode;
  color?: string;
  /** 이전 화면이 없을 때 돌아갈 곳 */
  fallback?: Href;
};

export function ScreenHeader({ title, backLabel = '뒤로', right, color = colors.text, fallback = '/' }: Props) {
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={() => goBack(fallback)}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        hitSlop={4}
        style={({ pressed }) => [styles.side, styles.left, pressed && styles.pressed]}
      >
        <BackIcon color={color} />
      </Pressable>
      <Text style={[styles.title, { color }]} accessibilityRole="header">
        {title}
      </Text>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  side: {
    position: 'absolute',
    width: HIT,
    height: HIT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: HIT / 2,
  },
  left: { left: 12 },
  right: { right: 12 },
  pressed: { opacity: 0.5 },
  title: { ...type.title },
});
