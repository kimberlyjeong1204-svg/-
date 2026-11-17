# 쉼표 2.0 작업 상태 (이어서 작업하기용)

브랜치 `claude/shuimpo-forest-space` → PR #3 (프리뷰만). `main` 병합·운영 배포·PR #2 변경 금지. 기존 자산 삭제 금지.

## 완료
- Phase 1: 공통 숲 공간(`src/app/forest/_layout.tsx`), 숲에 머물기(없음/30초/1분/3분), 문구 정리, 첫 방문 소리 안내·선택 기억
- 숲소리: 웹은 Web Audio 버퍼 재생(`src/audio/bufferLoopPlayer.web.ts`), 버튼 상태 꺼짐/켜는 중/켜짐/재생 차단/쉬는 중
- 숨 고르기 B1: 140px 빛의 고리(`BreathRing`), 설정 창에서 진행 중 리듬·시간·소리 변경, 비 소리 채널(재생기 2개 겹쳐 넘김), 「내 음악과 함께」 시 숲소리 쉼
- 디자인 통일: `src/components/forest/ui.tsx`(ForestButton·ForestChoiceGroup·ForestSheet·FOREST_TEXT·FOREST_MOTION)을 숲 화면 전체에 적용
- 홈 표지 A1: 숲 입구 그림이 표지(`src/app/index.tsx`, `ForestGate cover`). 입구에서 카메라가 한 걸음 다가감, 문은 살짝 열린 채(40°) 시작, 작은 푯말
- 숲 입구 임시 그림: `assets/forest/gate-temp/` (최종 그림 받으면 교체. 좌표는 같은 폴더 README)

- Rain Mode: 숲 위쪽 비 버튼, 비 소리 채널(`src/audio/rainChannel.ts`) 공유, 웹 비 효과(`ForestScene.web.tsx`), 날씨 저장

- 동굴(기능 구현, **임시 바위 그림이라 완료 처리 안 함**): `src/app/forest/cave.tsx`, `src/components/cave/*`, 소리 `src/audio/caveSound.web.ts`(Web Audio로 만든 장작불·울림·조약돌·종이 소리, 녹음 파일 없음)
  - 숲 메뉴 「동굴」 → 숲소리 12%로 3초 페이드, 장작불 소리 3초 페이드인, 비 소리는 멀어짐, 숲 그림은 쉼. 나가면 반대로
  - 내 마음 버리기(태우기·찢기, 어디에도 저장 안 함), 조약돌 던지기(끌거나 눌러 던짐, 울림), 가만히 머물기(기본)
  - 약 15분 뒤 한 번 「나가기 / 더 머물기」 (`globalThis.__SHIMPYO_CAVE_PROMPT_MS`로 점검 시간 단축 가능)
  - iOS 앱: 동굴 소리 미연결(`src/audio/caveSound.ts`), 불꽃은 단순한 일렁임
- 재방문: 숲소리 켬/끔·안내 여부·입구 본 여부·날씨·숲소리 음량·호흡 리듬·숨 고르기 시간 저장

## 자산이 있어야 진행 가능한 것
- 동굴 최종 그림(암벽·방석·무릎 안은 아이·장작 자리): `assets/cave/README.md`
- 숲 입구 최종 그림 층: `assets/forest/gate-temp/README.md`
- 문 경첩 소리, (선택) 장작불 녹음
- 숲 체험 요소: 나무 풍경(같은 화풍의 풍경 그림·풍경 음원), 조약돌 쌓기(사실적인 돌 그림), 연못 돌 던지기(새벽숲·연못 그림). 코드로 그린 그림은 숲의 사실적인 화풍과 맞지 않아 만들지 않음

## 진행 순서 (남은 일) — 동굴이 최우선
1. 동굴: 최종 그림 받으면 `src/components/cave/caveConfig.ts`의 그림·불 위치 교체, iOS 앱 동굴 소리 연결
2. 숲 체험 요소: 나무 풍경 → 조약돌 쌓기 → 연못에 돌 던지기
3. 재방문 설정 저장·빠른 입장
4. 모바일 성능·회귀 테스트

## 테스트 (scratchpad의 Playwright 스크립트로 확인, 저장소에는 단위 테스트만)
- `npm test`(단위), `npx tsc --noEmit`, `npm run build:web`, `npx expo export --platform ios`
