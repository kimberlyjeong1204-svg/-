import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Platform, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { FOREST_TEXT, ForestButton } from '../forest/ui';
import { fireFlare, paperTear } from '../../audio/caveSound';
import { pretendard, radius } from '../../theme';

/**
 * 마음에 걸린 것 내려놓기 (예전 「내 마음 버리기」)
 * 메모하듯 적은 글을 종이로 보여 주고, 직접 불에 태우거나 찢어서 버립니다.
 *
 * 개인정보: 적은 글은 이 화면의 메모리에만 있고 서버·기기 저장소·외부 어디에도 보내거나 남기지 않습니다.
 * 버리거나, 그만두거나, 동굴을 나가면 바로 지웁니다. 기록 목록·분석·점수·통계 없음.
 */
type Props = {
  /** 장작불 위치 (창 기준 좌표, 종이가 날아갈 곳) */
  fire: { x: number; y: number };
  soundOn: boolean;
  /** 종이를 불에 넣는 순간 (불이 잠깐 더 타오름) */
  onBurn: () => void;
  /** 끝나거나 그만둠 */
  onClose: () => void;
  /** 글 없이 쉬고 싶을 때: 조약돌 던지기로 */
  onPebble?: () => void;
};

type Phase = 'write' | 'burn' | 'tear';

export function LetGoPaper({ fire, soundOn, onBurn, onClose, onPebble }: Props) {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('write');
  const [paper, setPaper] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const { width } = useWindowDimensions();
  const native = Platform.OS !== 'web';
  const anim = useRef(new Animated.Value(0)).current;
  const paperRef = useRef<ComponentRef<typeof View>>(null);

  // 화면을 떠나면(동굴을 나가면) 글을 지움
  useEffect(() => () => setText(''), []);

  const finish = () => {
    setText('');
    anim.setValue(0);
    setPhase('write');
    onClose();
  };

  const burn = () => {
    if (!text.trim()) return;
    Keyboard.dismiss();
    // 화면에서 종이 위치를 잰 뒤, 종이가 불 쪽으로 날아가 작아지며 그을려 사라짐
    const go = (x: number, y: number, w: number, h: number) => {
      setPaper({ x, y, w, h });
      setPhase('burn');
      if (soundOn) fireFlare();
      Animated.timing(anim, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: native }).start(() => finish());
      setTimeout(onBurn, 900);
    };
    if (paperRef.current) paperRef.current.measureInWindow(go);
    else go(0, 0, 0, 0);
  };

  const tear = () => {
    if (!text.trim()) return;
    Keyboard.dismiss();
    setPhase('tear');
    if (soundOn) paperTear();
    Animated.timing(anim, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: native }).start(() => finish());
  };

  const cancel = () => {
    Keyboard.dismiss();
    finish();
  };

  // 종이 가운데에서 장작불까지의 거리
  const dx = fire.x - (paper.x + paper.w / 2);
  const dy = fire.y - (paper.y + paper.h / 2);
  const paperW = Math.min(width - 40, 360);

  const sheet = (clip?: 'left' | 'right') => {
    const full = (
      <View style={[styles.paper, { width: paperW }]}>
        <Text style={styles.paperText}>{text}</Text>
      </View>
    );
    if (!clip) return full;
    // 찢을 때는 종이 반쪽씩 (같은 종이를 반만 보이게 자름)
    return (
      <View style={{ width: paperW / 2, overflow: 'hidden' }}>
        <View style={{ width: paperW, marginLeft: clip === 'right' ? -paperW / 2 : 0 }}>{full}</View>
      </View>
    );
  };

  if (phase === 'write') {
    return (
      <View style={styles.wrap}>
        <View ref={paperRef} style={[styles.paper, { width: paperW }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            maxLength={2000}
            placeholder="마음에 걸린 것을 적어 보세요."
            placeholderTextColor="rgba(70, 58, 44, 0.45)"
            style={styles.input}
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            textAlignVertical="top"
            accessibilityLabel="마음에 걸린 것 적기. 적은 글은 저장되지 않아요."
          />
        </View>
        <Text style={FOREST_TEXT.caption}>적은 글은 어디에도 저장되지 않아요.</Text>
        <View style={styles.actions}>
          <ForestButton label="불에 태우기" variant="primary" size="sm" disabled={!text.trim()} onPress={burn} />
          <ForestButton label="찢어서 버리기" size="sm" disabled={!text.trim()} onPress={tear} />
          <ForestButton label="그만두기" variant="quiet" size="sm" onPress={cancel} />
        </View>
        {onPebble && (
          <ForestButton
            label="글 없이 조약돌 던지기"
            variant="quiet"
            size="sm"
            onPress={() => {
              setText('');
              Keyboard.dismiss();
              onPebble();
            }}
            accessibilityHint="적지 않고 조약돌을 던지며 쉬어요"
          />
        )}
      </View>
    );
  }

  if (phase === 'burn') {
    const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
    const ty = anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, dy * 0.75, dy] });
    return (
      <View style={styles.wrap} pointerEvents="none">
        <Animated.View
          style={{
            opacity: anim.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 0.85, 0] }),
            transform: [
              { translateX: tx },
              { translateY: ty },
              { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '9deg'] }) },
              { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.12] }) },
            ],
          }}
        >
          {sheet()}
          {/* 가장자리부터 그을림 */}
          <Animated.View style={[StyleSheet.absoluteFill, styles.char, { opacity: anim.interpolate({ inputRange: [0.25, 0.85], outputRange: [0, 0.92], extrapolate: 'clamp' }) }]} />
        </Animated.View>
      </View>
    );
  }

  // 찢기: 두 쪽으로 갈라져 기울며 떨어지고 사라짐
  const half = (side: -1 | 1) => (
    <Animated.View
      style={{
        position: 'absolute',
        left: side === -1 ? 0 : paperW / 2,
        opacity: anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.8, 0] }),
        transform: [
          { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, side * 70] }) },
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 220] }) },
          { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${side * 16}deg`] }) },
        ],
      }}
    >
      {sheet(side === -1 ? 'left' : 'right')}
    </Animated.View>
  );
  return (
    <View style={[styles.wrap, styles.tearStage]} pointerEvents="none">
      <View style={{ width: paperW, minHeight: 200 }}>
        {half(-1)}
        {half(1)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  paper: {
    minHeight: 200,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(236, 226, 206, 0.96)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    boxShadow: '0px 10px 28px rgba(0, 0, 0, 0.45)',
  },
  input: { minHeight: 170, maxHeight: 260, ...pretendard('400'), fontSize: 16, lineHeight: 25, color: '#3A3024', padding: 0, outlineStyle: 'none' } as object,
  paperText: { ...pretendard('400'), fontSize: 16, lineHeight: 25, color: '#3A3024' },
  char: { borderRadius: radius.sm, backgroundColor: '#1A0F08' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  tearStage: { minHeight: 240 },
});
