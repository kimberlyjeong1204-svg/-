# 「살아 숨 쉬는 동화 속 숲」 멍때리기 — 디자인·구현 계획 (제안)

> **적용 상태:** 멍때리기 화면에 「숲 / 노을」 선택으로 연결됨(기본: 숲). 웹앱은 잎·별·반딧불이 움직임까지, iOS 앱은 같은 그림을 정지 화면으로 보여 줌(움직임은 다음 단계).
> 숲 소리(귀뚜라미·풀벌레, 바람)는 음원을 받을 때까지 보류.
> 구현: `src/components/forest/`, 그림: `assets/forest/` (원본·작업 파일은 `design/forest/`)

## 1. 경험

밤과 새벽 사이, 깊은 숲. 나무 사이로 별빛이 보이고 반딧불이가 떠다닙니다. 이끼 언덕 위에 작은 어른 한 사람이 자기만의 시간을 보내고 있습니다.
사용자는 아무것도 하지 않아도 됩니다. 바라보다가 원할 때 나가면 됩니다.

- **기능은 그대로:** 30초 / 1분 / 3분, 시작·일시정지·그만하기, 끝나면 조용히 홈으로. 새 기능은 「숲 소리」 하나뿐입니다.
- **UI는 숲 뒤로:** 버튼과 아이콘은 옅은 아이보리. 시작 후 4초 동안 손대지 않으면 더 옅어지고, 화면을 누르면 다시 보입니다.
- **남은 시간:** 숲에서는 기본으로 숨김(「· · ·」). 누르면 보입니다(기존 설정 저장 방식 그대로).
- **기존 노을 화면:** 「배경: 숲 / 노을」 선택으로 남겨 둡니다. 「동작 줄이기」나 저전력 모드에서도 숲은 정지 그림으로 보여 줍니다.

## 2. 비주얼 방향

| 항목 | 기준 |
|---|---|
| 화풍 | 수채화·과슈풍 동화책 일러스트. 종이 질감, 부드러운 번짐, 붓 자국 |
| 색 | 미드나이트 블루 #0E1B30 · 짙은 청록 #173A43 · 이끼색 #1E4436 · 은은한 금빛 #E8C27A(빛에만) |
| 분위기 | 신비롭지만 무섭지 않게. 검정을 쓰지 않고 가장 어두운 곳도 청록빛 |
| 구도 | 넓고 깊은 숲, 화면 위 40%는 하늘과 나무 틈의 별. 인물은 화면 높이의 6~8% |
| 인물 | 날개 없는 성인. 아이·마스코트 아님. 카메라를 보지 않음. 쪼그려 앉기 / 누워 있기 / 풀피리 불기 |
| 기존 앱과의 연결 | 버튼 모양·둥글기·Pretendard는 그대로. 숲 화면에서만 글자와 아이콘을 아이보리 #EDE6D3로 바꿈 |

## 3. 일러스트 vs 코드

| 층 (뒤→앞) | 방식 | 움직임 |
|---|---|---|
| 1 하늘 그라데이션 | 코드 | 3분 동안 지평선 금빛이 아주 조금 밝아짐 |
| 2 별 | 코드 | 20~30개, 각각 3.5~9초 주기로 희미하게 반짝임 |
| 3 먼 숲 | **일러스트** | 정지 |
| 4 안개 | 코드 | 40초에 걸쳐 좌우로 흐름 |
| 5 가까운 숲 | **일러스트** | 정지 |
| 6 이끼 언덕 + 인물 | **일러스트** | 인물은 따로 잘라 자세 3종 중 하나를 들어올 때마다 선택 |
| 7 반딧불이 | 코드 | 8~12개, 불규칙한 깜빡임 + 18~30초의 느린 이동 |
| 8 앞쪽 풀·고사리 | **일러스트** 조각 + 코드 | ±1.5도로 6~10초에 걸쳐 흔들림 |
| 9 UI | 코드 | 4초 뒤 옅어짐 |

- 웹앱: CSS 애니메이션과 SVG. 움직임은 `transform`·`opacity`만 써서 GPU가 처리합니다(배터리 절약).
- iOS 앱: React Native `Animated`(네이티브 드라이버) + `react-native-svg`. 같은 층 구조를 씁니다.
- 일러스트 파일: 층마다 투명 배경 WebP(웹) / PNG(앱), 가로 1170px(아이폰 3배 기준). 전체 600KB 이하 목표.

## 4. 소리

- 새 음원 2개가 필요합니다: **귀뚜라미·풀벌레**, **부드러운 바람**. 빗소리 때처럼 전달해 주시면 길이·음량·이음새를 측정하고 라이선스를 기록합니다.
  - 후보로 이전에 보셨던 Mixkit 「Summer night crickets loop」가 있습니다(라이선스 확인 필요).
- 두 소리를 따로 반복 재생하고, 각각 음량 슬라이더로 섞습니다(시안 「숲 소리 조절」).
- **기본은 꺼짐.** 모바일 브라우저는 사용자가 누르기 전에는 소리를 못 내므로, 「소리 켜기」를 누르는 순간 천천히 커지게 합니다.
- 다른 앱 소리와 섞이는 방식(ambient)을 써서 무음 스위치를 따르고, 「내 음악과 함께」 원칙을 유지합니다.
- 반복 이음새는 기존 크로스페이드 재생기를 그대로 씁니다.

## 5. 접근성·저사양

- 「동작 줄이기」가 켜져 있으면 모든 움직임을 멈추고, 별과 반딧불이는 켜진 상태로 정지합니다.
- 저전력 모드이거나 화면이 느려지면(프레임 측정) 반딧불이·별·풀 수를 절반으로 줄입니다.
- 화면이 보이지 않을 때(앱 전환·잠금)는 애니메이션과 소리를 모두 멈춥니다.
- 글자 대비: 아이보리 #EDE6D3는 가장 밝은 하늘색 위에서도 9:1 이상입니다.
- 숲 그림은 장식이라 화면 읽기 프로그램에서는 건너뛰고, 「숲 속에서 쉬는 중」 한 줄만 읽어 줍니다.

## 6. 진행 순서

1. 시안 확정: 캔버스의 숲 시안 3장 검토
2. 일러스트 제작: 아래 프롬프트로 키 아트 1장 → 층별 분리. 또는 일러스트레이터 의뢰
3. 숲 소리 음원 2개 전달 → 측정·라이선스 기록
4. 구현: `ForestScene` 부품(웹·앱 공용 층 구조) → 멍때리기 화면에 「배경: 숲 / 노을」 추가
5. 테스트: 아이폰 실제 기기에서 배터리(3분 사용 시 소모), 발열, 동작 줄이기, 소리 켜기 흐름

## 7. 이미지 생성 프롬프트

AI 이미지 도구는 영어 프롬프트를 더 잘 따릅니다. 모든 프롬프트 앞에 **공통 스타일**을 붙이세요.
사용하는 도구의 이용 약관에서 **상업적 사용(App Store 출시) 허용 여부**를 꼭 확인하세요.

### 공통 스타일

```
Delicate watercolor and gouache storybook illustration, visible paper grain, soft wet-edge
bleeding, gentle hand-painted brushwork. Palette: midnight blue, deep teal, moss green, with
only faint warm gold glows. Calm, mysterious but never scary or gloomy. Twilight between night
and dawn. No pure black; the darkest shadows are blue-green. No text, no logo, no border.
```

### ① 키 아트 (전체 장면, 화풍 기준용)

```
[공통 스타일] Vertical 9:19.5 composition of a wide, deep fairy-tale forest clearing at
twilight. Tall layered conifers and old broadleaf trees frame the scene, with gaps in the canopy
showing a starry sky. A faint golden glow near the horizon behind the trees. Low mist between
tree layers. In the lower middle, a small mossy knoll. On it sits a tiny adult figure
(about 7% of the image height), seen from the side and slightly from behind, knees drawn up,
playing a blade of grass like a flute, absorbed in their own quiet moment, not looking at the
viewer. The figure is an ordinary grown-up person with simple earthy clothes, no wings, not a
child, not a mascot, not a fairy. A few fireflies glow softly near the ground. Ferns and tall
grass in the foreground. Lots of breathing room, quiet and peaceful.
```

### ② 먼 숲 층

```
[공통 스타일] Distant forest silhouette band only: soft, hazy layered conifer tops in muted
deep teal, fading into mist at the bottom, with irregular gaps between trees. Isolated on a
plain flat #FF00FF magenta background so it can be cut out. Wide horizontal strip, no sky,
no figures.
```

### ③ 가까운 숲 층

```
[공통 스타일] Near forest layer only: a few large tree trunks and dense conifer boughs on the
left and right edges, framing an open center, richer watercolor texture, moss on bark, darker
blue-green. Center left open and empty. Isolated on a plain flat #FF00FF magenta background.
```

### ④ 이끼 언덕

```
[공통 스타일] A small rounded mossy knoll with tiny clover, pebbles and a few small mushrooms,
soft rim light of faint gold on the top edge, seen from eye level. No figure. Isolated on a
plain flat #FF00FF magenta background.
```

### ⑤ 인물 (자세 3종, 같은 인물로)

```
[공통 스타일] The same small adult person in three separate poses, each isolated on a plain flat
#FF00FF magenta background: (a) sitting on the ground hugging knees, side view; (b) lying on
the back with hands folded on the chest, looking at the sky; (c) sitting cross-legged, playing a
blade of grass like a flute. Grown-up proportions, calm posture, simple earthy clothes, short
or tied hair, face in soft profile or turned away, never looking at the viewer. No wings, not a
child, not a mascot, not a fairy, not cute-chibi.
```

### ⑥ 앞쪽 풀·고사리 조각

```
[공통 스타일] Six separate foreground plant cutouts: two fern fronds, two clumps of tall
grass, one small bush of wildflowers with tiny pale blossoms, one curling fiddlehead. Each
piece stands upright with its base at the bottom edge, dark moss green with a faint gold edge
light. Isolated on a plain flat #FF00FF magenta background, evenly spaced, not overlapping.
```

### 제작 팁

- ① 키 아트로 화풍을 먼저 고른 뒤, 같은 도구·같은 설정으로 ②~⑥을 만들면 화풍이 맞습니다.
- 대부분의 도구는 투명 배경을 만들지 못합니다. 마젠타 배경으로 받으면 제가 잘라 투명하게 만들 수 있습니다.
- 인물이 아이처럼 나오면 「adult proportions, 8 heads tall」을 덧붙이세요.
- 마음에 드는 키 아트 한 장만 있어도, 나머지 층은 제가 키 아트를 나눠 만들 수 있는지 검토하겠습니다.
