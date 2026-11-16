/**
 * 쉼표. 디자인 토큰
 * 1단계 디자인 미리보기에서 확정한 값입니다.
 */
export const colors = {
  /** 주요 버튼·선택 표시. 흰 글씨 대비 4.7:1 */
  sageDeep: '#667A57',
  /** 호흡 원, 장식 */
  sage: '#A8B89A',
  /** 옅은 면 */
  sageLight: '#D6DECF',
  /** 선택된 보조 칩 배경 */
  sageMist: '#E4EADF',
  /** 앱 기본 배경 */
  ivory: '#F8F6EF',
  /** 카드 배경 */
  card: '#FFFDF8',
  /** 보조 버튼 */
  beige: '#E9E1D6',
  /** 분할 컨트롤 바탕 */
  track: '#ECE8DE',
  /** 카드 테두리 */
  line: '#ECE6DA',
  /** 본문 글자 */
  text: '#3E4237',
  /** 슬로건 등 */
  textSoft: '#4E5246',
  /** 보조 설명 (대비 4.8:1) */
  textMuted: '#6B6D61',
  white: '#FFFFFF',
} as const;

export const fonts = {
  /** 앱 이름, 슬로건, 종료 문구 */
  display: 'GowunBatang_700Bold',
  displayRegular: 'GowunBatang_400Regular',
  // 본문은 iOS 시스템 글꼴(산돌고딕 Neo)을 사용합니다. 앱 용량을 늘리지 않고 가독성이 좋습니다.
} as const;

/** 최소 터치 영역 (Apple HIG 44pt) */
export const HIT = 44;
