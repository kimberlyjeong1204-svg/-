import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * 쉼표. 디자인 토큰
 *
 * 모든 화면은 여기 있는 값만 씁니다. 색·글꼴·둥글기·그림자를 바꾸려면 이 파일만 고치면 됩니다.
 * 확인용 화면: 웹앱 주소 뒤에 /design 을 붙이면 아이폰에서 실제 크기로 볼 수 있습니다.
 */

// ─── 색 ───────────────────────────────────────────────
export const colors = {
  /** 주요 버튼·선택 표시. 흰 글씨 대비 4.7:1 */
  sageDeep: '#667A57',
  /** 선택된 보조 칩의 글자 (연한 세이지 위 6.6:1) */
  sageInk: '#3F5235',
  /** 호흡 원, 장식 */
  sage: '#A8B89A',
  /** 옅은 면 */
  sageLight: '#D6DECF',
  /** 선택된 보조 칩 배경 */
  sageMist: '#DCE5D3',
  /** 앱 기본 배경 */
  ivory: '#F8F6EF',
  /** 카드·팝업 배경 */
  card: '#FFFDF8',
  /** 보조 버튼 배경(카드보다 살짝 따뜻하게) */
  secondary: '#FBF8F1',
  /** 베이지(그만하기 버튼 등) */
  beige: '#E9E1D6',
  /** 선택하지 않은 항목의 바탕 */
  track: '#ECE8DE',
  /** 구분선. 카드 테두리로는 쓰지 않고 목록 사이 선에만 씁니다. */
  line: '#EAE4D8',
  /** 본문 글자 (아이보리 위 9.5:1) */
  text: '#3E4237',
  /** 슬로건·선택 안 된 항목 글자 (7.4:1) */
  textSoft: '#4E5246',
  /** 보조 설명·안내문. 어떤 배경에서도 5.2:1 이상 */
  textMuted: '#5A5D51',
  /** 경고가 아닌 부드러운 주의 문구 */
  caution: '#8A5A3C',
  white: '#FFFFFF',
} as const;

// ─── 둥글기 ───────────────────────────────────────────
export const radius = {
  /** 시간 목록 항목 등 작은 요소 */
  sm: 12,
  /** 목록 카드, 알림 미리보기 */
  md: 18,
  /** 팝업, 아래에서 올라오는 창 */
  lg: 24,
  /** 버튼, 분할 선택, 칩, 스위치 */
  pill: 999,
} as const;

// ─── 그림자 (테두리 대신 아주 약하게) ─────────────────
export const shadow = {
  /** 카드·보조 버튼: 바탕과 겨우 구분될 정도 */
  soft: { boxShadow: '0px 2px 10px rgba(90, 78, 58, 0.07)' } as ViewStyle,
  /** 팝업·시간 선택 창: 떠 있는 느낌만 */
  raised: { boxShadow: '0px 10px 28px rgba(90, 78, 58, 0.12)' } as ViewStyle,
  /** 주요 버튼: 테두리 없이 아주 옅은 세이지 그림자 */
  primary: { boxShadow: '0px 6px 16px rgba(102, 122, 87, 0.22)' } as ViewStyle,
} as const;

// ─── 글꼴 ─────────────────────────────────────────────
/**
 * 홈 로고 「쉼표.」와 「나만의 숲」만 감성적인 명조(고운바탕)를 씁니다.
 * 앱 용량을 줄이려고 글꼴 파일에는 다음 글자만 들어 있습니다: 쉼표. 나만의 숲
 * 다른 글자를 이 글꼴로 쓰려면 scripts/subset-display-font.sh의 TEXT에 추가하고 다시 실행하세요.
 */
export const fonts = {
  display: 'GowunBatang_700Bold',
  displayRegular: 'GowunBatang_400Regular',
} as const;

type Weight = '400' | '500' | '600';
const NATIVE_FAMILY: Record<Weight, string> = {
  '400': 'Pretendard-Regular',
  '500': 'Pretendard-Medium',
  '600': 'Pretendard-SemiBold',
};
const WEB_STACK = 'Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

/** 나머지 글자는 모두 Pretendard. 앱은 굵기별 파일, 웹은 하나의 이름 + 굵기 */
export function pretendard(weight: Weight): TextStyle {
  return Platform.OS === 'web' ? { fontFamily: WEB_STACK, fontWeight: weight } : { fontFamily: NATIVE_FAMILY[weight] };
}

/**
 * 글자 크기 단계 (요청 기준)
 * - 화면 제목 18–20 → 19
 * - 버튼 16–17 → 17 (분할 선택은 16)
 * - 호흡 문구 17–19 → 18 (원이 작을 때 17)
 * - 보조 설명 13–14 → 14 (칩·작은 표시는 13)
 */
export const type = {
  title: { ...pretendard('600'), fontSize: 19, lineHeight: 26, letterSpacing: -0.2 },
  button: { ...pretendard('500'), fontSize: 17, lineHeight: 22 },
  segment: { ...pretendard('500'), fontSize: 16, lineHeight: 21 },
  body: { ...pretendard('400'), fontSize: 16, lineHeight: 24 },
  bodyStrong: { ...pretendard('500'), fontSize: 16, lineHeight: 23 },
  cue: { ...pretendard('500'), fontSize: 18, lineHeight: 28, letterSpacing: -0.1 },
  cueSmall: { ...pretendard('500'), fontSize: 17, lineHeight: 26 },
  closing: { ...pretendard('500'), fontSize: 20, lineHeight: 30 },
  caption: { ...pretendard('400'), fontSize: 14, lineHeight: 21 },
  captionStrong: { ...pretendard('500'), fontSize: 14, lineHeight: 20 },
  small: { ...pretendard('500'), fontSize: 13, lineHeight: 18 },
  sectionLabel: { ...pretendard('600'), fontSize: 14, lineHeight: 20 },
  timer: { ...pretendard('400'), fontSize: 32, lineHeight: 40, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  number: { ...pretendard('500'), fontSize: 17, lineHeight: 22, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

// ─── 선택 / 비선택 상태 ──────────────────────────────
export const states = {
  /** 주요 선택(시간, 간격, 요일, 시각): 진한 세이지 + 흰 글씨 */
  selected: { backgroundColor: colors.sageDeep } as ViewStyle,
  selectedText: { color: colors.white, ...pretendard('600') } as TextStyle,
  /** 선택 안 됨: 회색 바탕 + 진한 회갈색 글씨 (6.5:1) */
  unselected: { backgroundColor: colors.track } as ViewStyle,
  unselectedText: { color: colors.textSoft } as TextStyle,
  /** 보조 선택(호흡 리듬 칩): 연한 세이지 + 짙은 세이지 글씨 */
  chipSelected: { backgroundColor: colors.sageMist } as ViewStyle,
  chipSelectedText: { color: colors.sageInk, ...pretendard('600') } as TextStyle,
  /** 꺼져 있는 설정 묶음 */
  disabledOpacity: 0.45,
} as const;

/** 최소 터치 영역 (Apple HIG 44pt) */
export const HIT = 44;
