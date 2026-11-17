# 방문 분석 (GA4)

- 측정 ID: `G-W9X8CVFTR2` (gtag.js, `src/lib/analytics.web.ts`)
- 운영 주소 `shimpyo-six.vercel.app`에서만 보냄. 프리뷰·로컬·iOS 앱은 보내지 않음

## 페이지 조회
- 자동 page_view는 끔(`send_page_view: false`). 앱이 화면 주소가 바뀔 때마다 `page_view`를 한 번 보냄(첫 접속 포함, 같은 주소 연속이면 건너뜀)
- 경로만 보냄: `/forest/breathe?start=1` → `/forest/breathe`
- **GA4에서 꺼야 할 설정 (중복 방지):** 관리 → 데이터 스트림 → 웹 스트림 → 향상된 측정 ⚙ →
  「페이지 조회수」 펼치기 → **「브라우저 기록 이벤트 기반 페이지 변경」 끄기**.
  켜 두면 /gift → /forest 이동이 두 번 잡힐 수 있음

## 이벤트
| 이름 | 언제 | 값 |
|---|---|---|
| `stay_timer_start` | 「쉬었다 갈게요」 쉬기 시작 | `minutes`(1·5·10), `place`(forest·cave), `chime` |
| `stay_timer_complete` | 시간이 끝남(타이머 끝내기·장소 이동 취소는 보내지 않음) | `minutes`, `place`, `chime_played`(종이 실제로 울렸는지) |

새 이벤트는 `AnalyticsEvent` 타입에 이름·값을 추가해야만 보낼 수 있음. 값은 숫자·참거짓·짧은 영문 낱말만 통과.

## 보내지 않는 것
- 동굴 「마음에 걸린 것 내려놓기」에 적은 글, 그 밖의 사용자가 입력한 글자
- 물음표 뒤 주소 값
- 향상된 측정의 「양식 상호작용」은 꺼 두기를 권장(앱에는 양식이 없지만 안전하게)

## 실시간 보고서로 확인
1. 보고서 → 실시간 열어 두기
2. 휴대폰에서 `https://shimpyo-six.vercel.app/gift` 열기 → 「나만의 숲으로 들어가기」
3. 「페이지 제목 및 화면 이름」·「이벤트 수」 카드에서 page_view가 /gift 1번, /forest 1번인지 확인(같은 사람 기준)

## 안 잡힐 때 점검
- 휴대폰에서 `https://shimpyo-six.vercel.app/?ga_debug=1` 열기 → 화면 아래 작은 상자에 상태 표시
  - 「스크립트 불러옴 · 보낸 이벤트 N개」: 앱은 정상으로 보냄 → GA4 DebugView(관리 → DebugView)에 나와야 함
  - 「차단됨」: 이 브라우저가 Google 분석을 막음(Safari 개인정보 보호 브라우징, 고급 추적 방지, 콘텐츠 차단기 등)
  - 상자가 안 보임: 예전 화면이 열려 있음 → 홈 화면 앱을 완전히 닫고(위로 밀어 종료) 다시 열기
