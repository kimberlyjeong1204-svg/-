import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SlidersIcon, SoundOffIcon, SoundOnIcon } from '../icons';
import { Toggle } from '../settingsParts';
import { HIT, colors, radius, shadow, type } from '../../theme';
import { FOREST_TRACKS, type ForestTrackKey } from '../../audio/sounds';
import { FOREST_TRACK_ORDER, type ForestSoundSettings } from '../../audio/useForestSound';

const INK = '#EDE6D3';

type Props = {
  value: ForestSoundSettings;
  onChange: (v: ForestSoundSettings) => void;
  /** 숲 공간처럼 「소리 켜기」를 따로 관리할 때 (없으면 저장된 value.on 사용) */
  masterOn?: boolean;
  onMasterChange?: (on: boolean) => void;
  /** 'settings'이면 버튼 아이콘을 조절(슬라이더) 모양으로 */
  trigger?: 'sound' | 'settings';
  /** 창 아래 안내 문구 (없으면 기본 문구) */
  note?: string;
};

/** 숲 화면 제목줄의 소리 아이콘과, 아래에서 올라오는 「숲 소리」 조절 창 */
export function ForestSoundButton({ value, onChange, masterOn, onMasterChange, trigger = 'sound', note }: Props) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const side = Math.max(0, (width - 520) / 2);
  const on = masterOn ?? value.on;
  const setOn = (next: boolean) => (onMasterChange ? onMasterChange(next) : onChange({ ...value, on: next }));
  const audible = on && FOREST_TRACK_ORDER.some((k) => !value.muted[k] && value.volume[k] > 0);

  const setTrack = (key: ForestTrackKey, patch: { volume?: number; muted?: boolean }) =>
    onChange({
      ...value,
      volume: patch.volume == null ? value.volume : { ...value.volume, [key]: patch.volume },
      muted: patch.muted == null ? value.muted : { ...value.muted, [key]: patch.muted },
    });

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={trigger === 'settings' ? '환경음 설정' : `숲 소리 조절: ${audible ? '켜짐' : '꺼짐'}`}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.5 }]}
      >
        {trigger === 'settings' ? <SlidersIcon color={INK} /> : audible ? <SoundOnIcon color={INK} /> : <SoundOffIcon color={INK} />}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="숲 소리 닫기" />
        <View style={[styles.sheet, { left: side, right: side, paddingBottom: Math.max(insets.bottom, 16) + 12 }]} accessibilityViewIsModal>
          <View style={styles.head}>
            <Text style={styles.title} accessibilityRole="header">
              숲 소리
            </Text>
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button" style={styles.close}>
              <Text style={styles.closeText}>닫기</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>소리 켜기</Text>
            <Toggle value={on} onChange={setOn} label="숲 소리 켜기" />
          </View>

          <View style={[styles.tracks, !on && styles.off]} pointerEvents={on ? 'auto' : 'none'}>
            {FOREST_TRACK_ORDER.map((key) => {
              const muted = value.muted[key];
              const pct = Math.round(value.volume[key] * 100);
              const name = FOREST_TRACKS[key].label;
              return (
                <View key={key} style={styles.track}>
                  <View style={styles.trackHead}>
                    <Text style={styles.label}>{name}</Text>
                    <Text style={styles.pct}>{muted ? '음소거' : `${pct}%`}</Text>
                  </View>
                  <View style={styles.trackControls}>
                    <Pressable
                      onPress={() => setTrack(key, { muted: !muted })}
                      accessibilityRole="button"
                      accessibilityLabel={`${name} ${muted ? '소리 켜기' : '음소거'}`}
                      accessibilityState={{ selected: muted }}
                      style={[styles.mute, muted && styles.muteOn]}
                    >
                      {muted ? <SoundOffIcon size={20} color={INK} /> : <SoundOnIcon size={20} color={INK} />}
                    </Pressable>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={1}
                      step={0.05}
                      value={value.volume[key]}
                      disabled={muted}
                      onValueChange={(v: number) => setTrack(key, { volume: Math.round(v * 100) / 100 })}
                      minimumTrackTintColor={colors.sage}
                      maximumTrackTintColor="rgba(237,230,211,0.25)"
                      thumbTintColor={colors.sageLight}
                      accessibilityLabel={`${name} 음량`}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.note}>{note ?? '두 소리는 따로 반복되고, 쉬는 동안에만 들려요. 끝날 때 천천히 작아져요.'}</Text>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: HIT, height: HIT, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
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
  title: { ...type.title, color: INK },
  close: { minHeight: HIT, minWidth: HIT, alignItems: 'flex-end', justifyContent: 'center' },
  closeText: { ...type.bodyStrong, color: INK },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tracks: { gap: 14 },
  off: { opacity: 0.4 },
  track: { gap: 4 },
  trackHead: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...type.bodyStrong, color: INK },
  pct: { ...type.number, fontSize: 15, color: 'rgba(237,230,211,0.85)' },
  trackControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mute: { width: HIT, height: HIT, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(237,230,211,0.10)' },
  muteOn: { backgroundColor: 'rgba(237,230,211,0.22)' },
  slider: { flex: 1, height: HIT },
  note: { ...type.caption, color: 'rgba(237,230,211,0.85)' },
});
