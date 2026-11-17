import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius, states, type } from '../theme';

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
  textColor = states.unselectedText.color as string,
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
            aria-checked={on}
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
  tone = 'light',
}: Omit<Props<T>, 'trackColor' | 'textColor' | 'style'> & {
  /** dark: 숲처럼 어두운 배경 위에서 쓰는 색 */
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={[styles.chips, disabled && styles.dim]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, disabled }}
            aria-checked={on}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            hitSlop={{ top: 5, bottom: 5 }}
            style={[styles.chip, dark && styles.chipDark, on && styles.chipOn]}
          >
            <Text style={[styles.chipLabel, dark && styles.chipLabelDark, on && styles.chipLabelOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.pill },
  dim: { opacity: 0.6 },
  item: { flex: 1, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  itemOn: { ...states.selected },
  label: { ...type.segment },
  labelOn: { ...states.selectedText },
  chips: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...states.unselected,
  },
  chipOn: { ...states.chipSelected },
  chipDark: { backgroundColor: 'rgba(237, 230, 211, 0.14)' },
  chipLabelDark: { color: '#EDE6D3' },
  chipLabel: { ...type.small, ...states.unselectedText },
  chipLabelOn: { ...states.chipSelectedText },
});
