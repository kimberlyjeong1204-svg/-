import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors } from '../theme';

type Option<T> = { value: T; label: string };

type Props<T> = {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  accessibilityLabel: string;
  trackColor?: string;
  textColor?: string;
  style?: ViewStyle;
};

/** 30초 / 1분 / 3분 같은 분할 선택 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
  accessibilityLabel,
  trackColor = colors.track,
  textColor = colors.textSoft,
  style,
}: Props<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: trackColor }, disabled && styles.dim, style]}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, disabled }}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            style={[styles.item, on && styles.itemOn]}
          >
            <Text style={[styles.label, { color: textColor }, on && styles.labelOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 리듬 선택처럼 작게 쓰는 보조 칩 */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  disabled,
  accessibilityLabel,
}: Omit<Props<T>, 'trackColor' | 'textColor' | 'style'>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={[styles.chips, disabled && styles.dim]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, disabled }}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            hitSlop={{ top: 5, bottom: 5 }}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 24 },
  dim: { opacity: 0.55 },
  item: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  itemOn: { backgroundColor: colors.sageDeep },
  label: { fontSize: 15 },
  labelOn: { color: colors.white, fontWeight: '500' },
  chips: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  chip: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E2DDD1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.sageMist, borderColor: colors.sage },
  chipLabel: { fontSize: 13, color: '#5C5F52' },
  chipLabelOn: { color: colors.text, fontWeight: '500' },
});
