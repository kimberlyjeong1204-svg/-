/**
 * 숲 위에서 쓰는 UI 색 (반투명하고 가벼운 버튼)
 * 아이보리 글자는 숲 그림의 가장 밝은 곳에서도 9:1 이상입니다.
 */
export const FOREST_UI = {
  ink: '#EDE6D3',
  inkSoft: 'rgba(237, 230, 211, 0.85)',
  glass: 'rgba(237, 230, 211, 0.12)',
  glassStrong: 'rgba(237, 230, 211, 0.22)',
  ground: '#0B1A1E',
  /** 숲 위 글자가 잘 읽히도록 아주 옅은 그림자 */
  textShadow: { textShadowColor: 'rgba(0, 0, 0, 0.45)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
} as const;
