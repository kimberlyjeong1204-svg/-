import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { shareForest, type GiftResult } from '../lib/gift';
import { FOREST_UI } from './forest/forestUi';
import { FOREST_TEXT } from './forest/ui';
import { radius } from '../theme';

/**
 * 숲 선물하기 — 홈과 숨 고르기 완료 화면이 함께 씀
 * 공유창을 취소하거나 링크를 복사해도 지금 화면에 그대로 머묾(화면 이동 없음). 복사·실패만 짧게 알려 줌
 */
export function useGiftShare() {
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const gift = useCallback(async (): Promise<GiftResult> => {
    const r = await shareForest();
    const text = r === 'copied' ? '링크를 복사했어요. 보내고 싶은 곳에 붙여 넣어 주세요.' : r === 'failed' ? '링크를 만들지 못했어요. 잠시 뒤 다시 해 주세요.' : null;
    if (text) {
      setNote(text);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setNote(null), 3500);
    }
    return r;
  }, []);
  return { gift, note };
}

/** 복사·실패 알림 (화면 위쪽에 잠깐) */
export function GiftNote({ note, top = 110 }: { note: string | null; top?: number }) {
  if (!note) return null;
  return (
    <View style={[styles.wrap, { top }]} pointerEvents="none">
      <Text style={styles.note} accessibilityLiveRegion="polite">
        {note}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
  note: { ...FOREST_TEXT.caption, fontSize: 14, color: FOREST_UI.ink, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: 'rgba(10, 22, 24, 0.7)', overflow: 'hidden' },
});
