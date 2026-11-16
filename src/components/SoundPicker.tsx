import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckIcon, MusicIcon, SoundOffIcon, SoundOnIcon } from './icons';
import { HIT, colors } from '../theme';
import { SOUND_OPTIONS, isAmbience, soundLabel, type SoundKey } from '../audio/sounds';

type Props = {
  value: SoundKey;
  onChange: (v: SoundKey) => void;
  color?: string;
};

/** 제목줄 오른쪽의 작은 소리 아이콘과 선택 메뉴 */
export function SoundPicker({ value, onChange, color = colors.textSoft }: Props) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  // 넓은 화면(웹)에서는 가운데 앱 영역의 오른쪽 위에 맞춥니다.
  const { width } = useWindowDimensions();
  const right = Math.max(16, (width - 520) / 2 + 16);
  const icon =
    value === 'myMusic' ? <MusicIcon color={color} /> : isAmbience(value) ? <SoundOnIcon color={color} /> : <SoundOffIcon color={color} />;
  const note =
    value === 'myMusic'
      ? '다른 앱에서 음악을 틀어 두세요.\n쉼표.는 그 음악을 멈추지 않아요.'
      : isAmbience(value)
        ? '끝날 때 소리가 천천히 작아져요.\n다른 앱 음악이 나오면 빗소리는 쉬어요.'
        : '쉼표.는 소리를 내지 않아요.';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`소리 선택: ${soundLabel(value)}`}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        {icon}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="소리 선택 닫기" />
        <View style={[styles.menu, { top: insets.top + 50, right }]} accessibilityRole="menu">
          {SOUND_OPTIONS.map((o) => {
            const selected = o.key === value;
            return (
              <View key={o.key}>
                {o.key === 'myMusic' && <View style={styles.divider} />}
                <Pressable
                  accessibilityRole="menuitem"
                  accessibilityState={{ checked: selected }}
                  aria-checked={selected}
                  onPress={() => {
                    onChange(o.key);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.option, selected && styles.optionOn, pressed && styles.optionPressed]}
                >
                  <Text style={styles.optionLabel}>{o.label}</Text>
                  {selected && <CheckIcon />}
                </Pressable>
              </View>
            );
          })}
          <Text style={styles.note}>{note}</Text>
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
    width: 228,
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
  divider: { height: 1, backgroundColor: '#EFEAE0', marginHorizontal: 8, marginVertical: 4 },
  optionLabel: { fontSize: 15, color: colors.text },
  note: { marginHorizontal: 12, marginVertical: 6, fontSize: 11.5, lineHeight: 17, color: colors.textMuted },
});
