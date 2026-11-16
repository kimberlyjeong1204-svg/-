import { useState, type ReactNode } from 'react';
import { PixelRatio, ScrollView, StyleSheet, Text, View, useWindowDimensions, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { ChipGroup, Segmented } from '../components/Segmented';
import { Card, DayPicker, Toggle } from '../components/settingsParts';
import { BreathIcon, CupIcon } from '../components/icons';
import { colors, fonts, radius, shadow, type } from '../theme';
import type { Days } from '../lib/schedule';

/**
 * 디자인 확인 화면 (메뉴에는 없고 주소로만 열림: 웹앱 주소 뒤에 /design)
 * 아이폰 실제 화면에서 글자 크기·대비·선택 상태·그림자를 한눈에 확인하기 위한 화면입니다.
 */

const TYPE_SAMPLES: { name: string; spec: string; style: TextStyle; text: string }[] = [
  { name: '화면 제목', spec: 'SemiBold 19 / 26', style: type.title, text: '숨 고르기' },
  { name: '버튼', spec: 'Medium 17 / 22', style: type.button, text: '멍때리기' },
  { name: '분할 선택', spec: 'Medium 16 / 21', style: type.segment, text: '30초 · 1분 · 3분' },
  { name: '호흡 문구', spec: 'Medium 18 / 28', style: type.cue, text: '긴장을 내려놓듯,\n천천히 내쉬어요' },
  { name: '호흡 문구(작은 화면)', spec: 'Medium 17 / 26', style: type.cueSmall, text: '편안하게 들이쉬어요' },
  { name: '본문', spec: 'Regular 16 / 24', style: type.body, text: '하루 5번, 종류를 번갈아 알려드려요.' },
  { name: '본문 강조', spec: 'Medium 16 / 23', style: type.bodyStrong, text: '휴식 알림 사용' },
  { name: '보조 설명', spec: 'Regular 14 / 21', style: type.caption, text: '원의 속도를 꼭 따라 하지 않아도 괜찮아요.' },
  { name: '작은 표시', spec: 'Medium 13 / 18', style: type.small, text: '기본 · 3초 / 5초' },
  { name: '종료 문구', spec: 'Medium 20 / 30', style: type.closing, text: '잠깐 쉬어갔어요.' },
  { name: '타이머', spec: 'Regular 32 / 40', style: type.timer, text: '00:59' },
];

const COLOR_SAMPLES: { name: string; hex: string; note: string }[] = [
  { name: '본문 글자', hex: colors.text, note: '아이보리 위 9.5:1' },
  { name: '보조 글자', hex: colors.textSoft, note: '7.4:1 · 선택 안 된 항목' },
  { name: '안내문', hex: colors.textMuted, note: '모든 배경에서 5.2:1 이상' },
  { name: '진한 세이지', hex: colors.sageDeep, note: '흰 글씨 4.7:1 · 메인 버튼·선택' },
  { name: '세이지 글자', hex: colors.sageInk, note: '연한 세이지 위 6.6:1' },
  { name: '메인 그린', hex: colors.sage, note: '호흡 원·장식(글자에는 쓰지 않음)' },
  { name: '연한 세이지', hex: colors.sageMist, note: '보조 선택 바탕' },
  { name: '선택 안 됨 바탕', hex: colors.track, note: '분할 선택·요일' },
  { name: '아이보리', hex: colors.ivory, note: '앱 배경' },
  { name: '카드', hex: colors.card, note: '카드·팝업 배경' },
];

export default function DesignCheck() {
  const { width, height } = useWindowDimensions();
  const [seg, setSeg] = useState(60);
  const [chip, setChip] = useState<'base' | 'slow'>('base');
  const [on, setOn] = useState(true);
  const [days, setDays] = useState<Days>([true, true, true, true, true, false, false]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScreenHeader title="디자인 확인" />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.meta}>
          화면 {Math.round(width)}×{Math.round(height)}pt · 배율 {PixelRatio.get()}x · 글자 크기 설정 {PixelRatio.getFontScale().toFixed(2)}배
        </Text>

        <Section title="로고 (고운바탕, 예외)">
          <Text style={styles.logo}>쉼표.</Text>
          <Text style={styles.slogan}>몰입하는 일상에, 잠깐의 여유.</Text>
        </Section>

        <Section title="글꼴과 크기 (Pretendard)">
          {TYPE_SAMPLES.map((t) => (
            <View key={t.name} style={styles.typeRow}>
              <Text style={styles.specLabel}>
                {t.name} · {t.spec}
              </Text>
              <Text style={[t.style, { color: colors.text }]}>{t.text}</Text>
            </View>
          ))}
        </Section>

        <Section title="버튼">
          <View style={[styles.btn, styles.btnPrimary]}>
            <BreathIcon color={colors.white} />
            <Text style={[type.button, { color: colors.white }]}>숨 고르기</Text>
          </View>
          <View style={[styles.btn, styles.btnSecondary]}>
            <CupIcon />
            <Text style={[type.button, { color: colors.text }]}>멍때리기</Text>
          </View>
          <Text style={styles.specLabel}>메인: 테두리 없음, 진한 세이지 · 보조: 테두리 없이 아주 약한 그림자</Text>
        </Section>

        <Section title="선택 / 비선택">
          <Segmented accessibilityLabel="예시 분할 선택" options={[{ value: 30, label: '30초' }, { value: 60, label: '1분' }, { value: 180, label: '3분' }]} value={seg} onChange={setSeg} />
          <ChipGroup accessibilityLabel="예시 칩" options={[{ value: 'base', label: '기본 · 3초 / 5초' }, { value: 'slow', label: '느리게 · 4초 / 6초' }]} value={chip} onChange={setChip} />
          <DayPicker value={days} onChange={setDays} />
          <View style={styles.inline}>
            <Text style={[type.bodyStrong, { color: colors.text }]}>스위치</Text>
            <Toggle value={on} onChange={setOn} label="예시 스위치" />
          </View>
        </Section>

        <Section title="면과 그림자">
          <Card style={styles.sample}>
            <Text style={[type.bodyStrong, { color: colors.text }]}>카드 · 둥글기 {radius.md} · 약한 그림자</Text>
            <Text style={[type.caption, { color: colors.textMuted }]}>목록 사이에만 구분선을 씁니다.</Text>
          </Card>
          <View style={[styles.sample, styles.popover]}>
            <Text style={[type.bodyStrong, { color: colors.text }]}>팝업 · 둥글기 {radius.lg} · 떠 있는 그림자</Text>
          </View>
        </Section>

        <Section title="색과 대비">
          {COLOR_SAMPLES.map((c) => (
            <View key={c.name} style={styles.colorRow}>
              <View style={[styles.swatch, { backgroundColor: c.hex }]} />
              <View style={styles.colorText}>
                <Text style={[type.bodyStrong, { color: colors.text }]}>
                  {c.name} <Text style={[type.small, { color: colors.textMuted }]}>{c.hex}</Text>
                </Text>
                <Text style={[type.caption, { color: colors.textMuted }]}>{c.note}</Text>
              </View>
            </View>
          ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ivory },
  body: { paddingHorizontal: 20, paddingBottom: 48, gap: 28 },
  meta: { ...type.small, color: colors.textMuted, textAlign: 'center' },
  section: { gap: 12 },
  sectionTitle: { ...type.sectionLabel, color: colors.textSoft },
  sectionBody: { gap: 14 },
  logo: { fontFamily: fonts.display, fontSize: 48, lineHeight: 58, color: colors.text },
  slogan: { fontFamily: fonts.displayRegular, fontSize: 18, lineHeight: 28, color: colors.textSoft },
  typeRow: { gap: 4 },
  specLabel: { ...type.small, color: colors.textMuted },
  btn: { height: 62, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginHorizontal: 24 },
  btnPrimary: { backgroundColor: colors.sageDeep, ...shadow.primary },
  btnSecondary: { backgroundColor: colors.secondary, ...shadow.soft },
  inline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sample: { padding: 16, gap: 4 },
  popover: { borderRadius: radius.lg, backgroundColor: colors.card, ...shadow.raised },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: { width: 40, height: 40, borderRadius: radius.sm, boxShadow: 'inset 0px 0px 0px 1px rgba(62, 66, 55, 0.08)' },
  colorText: { flex: 1, gap: 2 },
});
