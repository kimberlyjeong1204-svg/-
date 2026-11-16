import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckIcon, SoundOffIcon, SoundOnIcon } from './icons';
import { HIT, colors } from '../theme';
import { SOUND_OPTIONS, soundLabel, type SoundKey } from '../audio/sounds';

type Props = {
  value: SoundKey;
  onChange: (v: SoundKey) => void;
  color?: string;
};

/** 제목줄 오른쪽의 작은 소리 아이콘과 선택 메뉴 */
export function SoundPicker({ value, onChange, color = colors.textSoft }: Props) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const on = value !== 'none';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`소리 선택: ${soundLabel(value)}`}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        {on ? <SoundOnIcon color={color} /> : <SoundOffIcon color={color} />}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="소리 선택 닫기" />
        <View style={[styles.menu, { top: insets.top + 50 }]} accessibilityRole="menu">
          {SOUND_OPTIONS.map((o) => {
            const selected = o.key === value;
            return (
              <Pressable
                key={o.key}
                accessibilityRole="menuitem"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  onChange(o.key);
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.option, selected && styles.optionOn, pressed && styles.optionPressed]}
              >
                <Text style={styles.optionLabel}>{o.label}</Text>
                {selected && <CheckIcon />}
              </Pressable>
            );
          })}
          <Text style={styles.note}>끝날 때 소리가 천천히 작아져요.</Text>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: HIT, height: HIT, borderRadius: HIT / 2, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.5 },
  menu: {
    position: 'absolute',
    right: 16,
    width: 212,
    padding: 6,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#5A503C',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  option: {
    minHeight: HIT,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionOn: { backgroundColor: '#EEF1EA' },
  optionPressed: { backgroundColor: '#F3F0E8' },
  optionLabel: { fontSize: 15, color: colors.text },
  note: { marginHorizontal: 12, marginVertical: 6, fontSize: 11.5, lineHeight: 17, color: colors.textMuted },
});
