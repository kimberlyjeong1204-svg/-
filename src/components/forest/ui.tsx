import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions, type AccessibilityRole, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FOREST_UI } from './forestUi';
import { HIT, colors, radius, shadow, states, type } from '../../theme';

/**
 * 숲 공간 공통 부품 (홈 표지·입구·숲·숨 고르기·숲에 머물기가 같은 모양을 씀)
 *
 * 버튼 모양은 다섯 가지뿐입니다.
 * - primary: 짙은 세이지. 화면에서 가장 중요한 한 가지(숲으로 들어가기, 숲소리 켜고 들어가기)
 * - glass:   반투명. 숲 위의 일반 버튼(활동, 설정, 재생)
 * - strong:  조금 더 진한 반투명. 시작 버튼처럼 눈에 띄어야 할 때
 * - solid:   짙은 반투명 + 가는 테두리. 숲 첫 화면의 주요 활동(숨 고르기·숲에 머물기·동굴 가기)
 * - warn:    테두리가 있는 어두운 반투명. 소리가 막혔을 때처럼 눌러 달라는 상태
 * - quiet:   배경 없이 글자만. 보조 선택(조용히 들어가기, 바로 들어가기)
 * 크기: lg(56, 화면의 주 버튼) / md(48, 일반) / sm(40, 작은 버튼) / icon(40×40 원)
 */

/** 숲 화면 움직임 시간 (모든 화면 공통) */
export const FOREST_MOTION = {
  /** 메뉴 다시 보이기 */
  uiIn: 250,
  /** 메뉴 천천히 숨기기 */
  uiOut: 1600,
  /** 몇 초 동안 손대지 않으면 메뉴가 숨는지 */
  hideAfter: 4000,
  /** 안내창·창이 나타나는 시간 */
  appear: 700,
} as const;

type Variant = 'primary' | 'glass' | 'strong' | 'solid' | 'warn' | 'quiet';
type Size = 'lg' | 'md' | 'sm' | 'icon';

type ButtonProps = {
  label?: string;
  icon?: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  /** 스위치처럼 켜짐/꺼짐이 있는 버튼 */
  checked?: boolean;
  testID?: string;
};

export function ForestButton({
  label,
  icon,
  onPress,
  variant = 'glass',
  size = 'md',
  disabled,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  checked,
  testID,
}: ButtonProps) {
  const isSwitch = checked != null;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole={isSwitch ? 'switch' : accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={isSwitch ? { checked, disabled } : { disabled }}
      aria-checked={isSwitch ? checked : undefined}
      style={({ pressed }) => [
        styles.base,
        SIZE[size],
        VARIANT[variant],
        pressed && (variant === 'primary' ? styles.pressedPrimary : styles.pressed),
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon}
      {label != null && <Text style={[styles.label, LABEL[size], variant === 'primary' && styles.labelPrimary]}>{label}</Text>}
    </Pressable>
  );
}

/** 하나만 고르는 칩 묶음 (시간·리듬·소리 등) */
export function ForestChoiceGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  showLabel = true,
  align = 'start',
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  showLabel?: boolean;
  align?: 'start' | 'center';
}) {
  return (
    <View style={[styles.group, align === 'center' && styles.center]}>
      {showLabel && <Text style={styles.groupLabel}>{label}</Text>}
      <View style={[styles.chips, align === 'center' && styles.chipsCenter]} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              aria-checked={on}
              style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** 아래에서 올라오는 창 (숲소리 조절, 숨 고르기 설정 등) */
export function ForestSheet({
  open,
  onClose,
  title,
  closeLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 바깥을 눌러 닫을 때 읽어 줄 이름 */
  closeLabel: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const side = Math.max(0, (width - 520) / 2);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={closeLabel} />
      <View style={[styles.sheet, { left: side, right: side, paddingBottom: Math.max(insets.bottom, 16) + 12 }]} accessibilityViewIsModal>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.close}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </View>
        {children}
      </View>
    </Modal>
  );
}

/** 숲 위 글자 (모든 화면 공통 크기·그림자) */
export const FOREST_TEXT = StyleSheet.create({
  cue: { ...type.bodyStrong, fontSize: 17, color: '#F6F1E3', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } },
  closing: { ...type.closing, color: FOREST_UI.ink, textAlign: 'center', ...FOREST_UI.textShadow },
  caption: { ...type.caption, fontSize: 13, color: FOREST_UI.inkSoft, textAlign: 'center', ...FOREST_UI.textShadow },
  time: { ...type.small, fontSize: 15, color: FOREST_UI.inkSoft, textAlign: 'center', ...FOREST_UI.textShadow, fontVariant: ['tabular-nums'] },
  sheetNote: { ...type.caption, color: FOREST_UI.inkSoft, lineHeight: 19 },
  sheetLabel: { ...type.bodyStrong, color: FOREST_UI.ink },
});

const SIZE: Record<Size, ViewStyle> = {
  lg: { minHeight: 56, paddingHorizontal: 24 },
  md: { minHeight: HIT + 4, paddingHorizontal: 20 },
  sm: { minHeight: 40, paddingHorizontal: 14 },
  icon: { width: 40, height: 40, paddingHorizontal: 0 },
};
const VARIANT: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.sageDeep, ...shadow.primary },
  glass: { backgroundColor: FOREST_UI.glass },
  strong: { backgroundColor: FOREST_UI.glassStrong },
  // 어두운 숲 위에서 가장 잘 읽히는 주요 활동 버튼: 짙은 반투명 + 가는 테두리
  solid: { backgroundColor: 'rgba(8, 20, 22, 0.62)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(237, 230, 211, 0.28)' },
  warn: { backgroundColor: 'rgba(10, 22, 24, 0.72)', borderWidth: 1, borderColor: 'rgba(237, 230, 211, 0.35)' },
  quiet: { backgroundColor: 'transparent' },
};
const LABEL: Record<Size, object> = {
  lg: { fontSize: 17 },
  md: { fontSize: 16 },
  sm: { fontSize: 14 },
  icon: {},
};

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { ...type.button, color: FOREST_UI.ink, ...FOREST_UI.textShadow },
  labelPrimary: { color: colors.white },
  pressed: { opacity: 0.6 },
  pressedPrimary: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  disabled: { opacity: 0.4 },
  group: { gap: 8 },
  center: { alignItems: 'center' },
  groupLabel: { ...type.small, color: FOREST_UI.inkSoft, ...FOREST_UI.textShadow },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipsCenter: { justifyContent: 'center' },
  chip: { minHeight: 40, minWidth: 56, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: FOREST_UI.glass },
  chipOn: { ...states.selected },
  chipText: { ...type.small, fontSize: 14, color: FOREST_UI.ink },
  chipTextOn: { ...states.selectedText },
  backdrop: { flex: 1, backgroundColor: 'rgba(5,12,14,0.35)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 22,
    gap: 16,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: 'rgba(16, 32, 36, 0.96)',
    ...shadow.raised,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...type.title, color: FOREST_UI.ink },
  close: { minHeight: HIT, minWidth: HIT, alignItems: 'flex-end', justifyContent: 'center' },
  closeText: { ...type.bodyStrong, color: FOREST_UI.ink },
});
