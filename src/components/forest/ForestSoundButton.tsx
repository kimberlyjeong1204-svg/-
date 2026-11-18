import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { ForestSheet } from './ui';
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
  /** 숲 소리 대신 보여 줄 소리(동굴의 장작불처럼 그 화면에서 실제로 조절되는 소리) */
  tracks?: Track[];
  onTrack?: (key: string, patch: { volume?: number; muted?: boolean }) => void;
  title?: string;
  /** 「화면을 꺼도 계속 듣기」(숲·동굴 공통) */
  keepAudio?: boolean;
  onKeepAudio?: (on: boolean) => void;
};

export type Track = { key: string; label: string; volume: number; muted: boolean };

/** 숲 화면 제목줄의 소리 아이콘과, 아래에서 올라오는 「숲 소리」 조절 창 */
export function ForestSoundButton({ value, onChange, masterOn, onMasterChange, trigger = 'sound', note, tracks, onTrack, title = '숲 소리', keepAudio, onKeepAudio }: Props) {
  const [open, setOpen] = useState(false);
  const on = masterOn ?? value.on;
  const setOn = (next: boolean) => (onMasterChange ? onMasterChange(next) : onChange({ ...value, on: next }));
  const audible = on && FOREST_TRACK_ORDER.some((k) => !value.muted[k] && value.volume[k] > 0);

  const list: Track[] = tracks ?? FOREST_TRACK_ORDER.map((k) => ({ key: k, label: FOREST_TRACKS[k].label, volume: value.volume[k], muted: value.muted[k] }));
  const setTrack = (key: string, patch: { volume?: number; muted?: boolean }) =>
    onTrack ? onTrack(key, patch) : setForestTrack(key as ForestTrackKey, patch);
  const setForestTrack = (key: ForestTrackKey, patch: { volume?: number; muted?: boolean }) =>
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

      <ForestSheet open={open} onClose={() => setOpen(false)} title={title} closeLabel={`${title} 닫기`}>
        <View style={styles.row}>
          <Text style={styles.label}>소리 켜기</Text>
          <Toggle value={on} onChange={setOn} label="숲 소리 켜기" />
        </View>
        {onKeepAudio && (
          <View style={styles.keep}>
            <View style={styles.row}>
              <Text style={styles.label}>화면을 꺼도 계속 듣기</Text>
              <Toggle value={!!keepAudio} onChange={onKeepAudio} label="화면을 꺼도 계속 듣기" />
            </View>
            <Text style={styles.note}>켜면 다른 앱을 쓰거나 화면을 잠가도 지금 소리가 이어져요. 이때는 무음 모드여도 소리가 나요. 숲과 동굴이 같은 설정을 써요.</Text>
          </View>
        )}

        <View style={[styles.tracks, !on && styles.off]} pointerEvents={on ? 'auto' : 'none'}>
          {list.map(({ key, label: name, volume, muted }) => {
            const pct = Math.round(volume * 100);
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
                    value={volume}
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
      </ForestSheet>
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: HIT, height: HIT, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tracks: { gap: 14 },
  keep: { gap: 2, marginBottom: 10 },
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
