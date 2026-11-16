import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HIT, colors, pretendard, radius, shadow, states, type } from '../theme';

type Props = {
  visible: boolean;
  title: string;
  /** 0시부터 지난 분 */
  value: number;
  /** 분 단위 간격. 60이면 시만 고릅니다. */
  minuteStep?: number;
  onClose: () => void;
  onDone: (min: number) => void;
};

const ROW = 44;

/**
 * 아래에서 올라오는 시간 선택 창. 아이폰·안드로이드·웹에서 같은 모양으로 동작합니다.
 * 시와 분 목록에서 하나씩 눌러 고른 뒤 「완료」를 누릅니다.
 */
export function TimePickerSheet({ visible, title, value, minuteStep = 5, onClose, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const side = Math.max(0, (width - 520) / 2);
  const [hour, setHour] = useState(Math.floor(value / 60));
  const [minute, setMinute] = useState(value % 60);
  const hourRef = useRef<ScrollViewInstance>(null);
  const minuteRef = useRef<ScrollViewInstance>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = minuteStep >= 60 ? [0] : Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);

  useEffect(() => {
    if (!visible) return;
    const h = Math.floor(value / 60);
    const m = minutes.includes(value % 60) ? value % 60 : 0;
    setHour(h);
    setMinute(m);
    // 고른 값이 가운데쯤 보이도록
    const t = setTimeout(() => {
      hourRef.current?.scrollTo({ y: Math.max(0, (h - 2) * ROW), animated: false });
      minuteRef.current?.scrollTo({ y: Math.max(0, (minutes.indexOf(m) - 2) * ROW), animated: false });
    }, 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="닫기" />
      <View style={[styles.sheet, { left: side, right: side, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.headerBtn}>
            <Text style={styles.cancel}>취소</Text>
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={() => onDone(hour * 60 + minute)} accessibilityRole="button" style={styles.headerBtn}>
            <Text style={styles.done}>완료</Text>
          </Pressable>
        </View>
        <View style={styles.columns}>
          <Column refEl={hourRef} items={hours} selected={hour} onSelect={setHour} suffix="시" label="시" />
          <Text style={styles.colon}>:</Text>
          <Column refEl={minuteRef} items={minutes} selected={minute} onSelect={setMinute} suffix="분" label="분" />
        </View>
      </View>
    </Modal>
  );
}

function Column({
  refEl,
  items,
  selected,
  onSelect,
  suffix,
  label,
}: {
  refEl: React.RefObject<ScrollViewInstance | null>;
  items: number[];
  selected: number;
  onSelect: (v: number) => void;
  suffix: string;
  label: string;
}) {
  return (
    <ScrollView ref={refEl} style={styles.column} contentContainerStyle={styles.columnContent} accessibilityLabel={label} showsVerticalScrollIndicator={false}>
      {items.map((v) => {
        const on = v === selected;
        return (
          <Pressable
            key={v}
            onPress={() => onSelect(v)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            aria-checked={on}
            accessibilityLabel={`${v}${suffix}`}
            style={[styles.item, on && styles.itemOn]}
          >
            <Text style={[styles.itemText, on && styles.itemTextOn]}>{String(v).padStart(2, '0')}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(62,66,55,0.25)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.ivory,
    ...shadow.raised,
  },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  headerBtn: { minWidth: 64, minHeight: HIT, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.bodyStrong, fontSize: 17, color: colors.text },
  cancel: { ...type.bodyStrong, color: colors.textMuted },
  done: { ...type.bodyStrong, ...pretendard('600'), color: colors.sageDeep },
  columns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24, paddingBottom: 8 },
  column: { height: ROW * 5, width: 96, flexGrow: 0 },
  columnContent: { paddingVertical: 4 },
  colon: { ...type.number, fontSize: 22, color: colors.textMuted },
  item: { height: ROW, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  itemOn: { ...states.selected },
  itemText: { ...type.number, fontSize: 20, lineHeight: 26, color: colors.text },
  itemTextOn: { ...states.selectedText },
});
