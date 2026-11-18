# 환경음 출처와 라이선스

쉼표. 앱에 포함된 환경음의 출처 기록입니다. 출처 표기는 라이선스상 필수가 아니지만 기록으로 남겨 둡니다.

| 앱 파일 | 앱 안 이름 | 원본 음원 | 길이 | 제공처 | 라이선스 |
|---|---|---|---|---|---|
| `long-rain.mp3` | 잔잔한 비 | Long rain ambience | 5:35 | [Mixkit](https://mixkit.co) | [Mixkit Sound Effects Free License](https://mixkit.co/license/modal/sfxFree/) |
| `light-rain.m4a` | 가벼운 비 | Light rain looping (Mixkit #1249) | 1:36 | [Mixkit](https://mixkit.co) | [Mixkit Sound Effects Free License](https://mixkit.co/license/modal/sfxFree/) |
| `forest-crickets.m4a` | 귀뚜라미 · 풀벌레 (숲) | Summer night crickets loop (Mixkit #1789) | 0:42 | [Mixkit](https://mixkit.co/free-sound-effects/crickets/) | [Mixkit Sound Effects Free License](https://mixkit.co/license/modal/sfxFree/) |
| `forest-wind.m4a` | 나뭇잎 사이 바람 (숲) | Wind in the forest (Mixkit #1237) | 0:25 | [Mixkit](https://mixkit.co/free-sound-effects/wind/) | [Mixkit Sound Effects Free License](https://mixkit.co/license/modal/sfxFree/) |

- 라이선스 확인: 2026-11-16, 프로젝트 소유자가 Mixkit 공식 라이선스 페이지에서 두 음원 모두 Sound Effects Free License 적용 대상임을 확인함.
- 라이선스 요지: 상업적·비상업적 프로젝트에서 무료로 사용할 수 있으며, 다른 기능과 결합한 최종 결과물(End Product)에 포함할 수 있음.

- 숲 소리 2개: 2026-11-16 개발 과정에서 Mixkit 라이선스 원문(https://mixkit.co/license/modal/sfxFree/)을 직접 확인하고, 원본 WAV를 Mixkit에서 받아 포함함.
  - 원문 요지: 상업적·비상업적 프로젝트에서 무료. 소리를 포함하되 범위가 크고 성격이 다른 최종 결과물(End Product)을 만들어 웹 등으로 배포 가능.
    음원만 따로, 스톡·도구·템플릿으로 재배포하거나 자기 것으로 주장하거나 권리 관리 서비스에 등록하는 것은 금지.
  - 원본: https://assets.mixkit.co/active_storage/sfx/1789/1789.wav, https://assets.mixkit.co/active_storage/sfx/1237/1237.wav

## 사용 조건 (이 프로젝트의 원칙)

- 앱 안에서 선택형 배경음으로만 재생합니다.
- 음원 자체를 따로 판매하거나, 내려받기·내보내기·공유 기능으로 제공하지 않습니다.
- 음원을 다른 효과음 모음이나 음원 서비스에 넣지 않습니다.

## 앱에 넣으면서 바꾼 점

- `light-rain.m4a`: 원본 WAV(44.1kHz, 16bit, 스테레오)를 앱 용량을 줄이기 위해 AAC 128kbps로 변환했습니다. 소리 내용은 바꾸지 않았습니다.
- `long-rain.mp3`: 전달받은 MP3(128kbps)를 그대로 사용합니다.
- `forest-crickets.m4a`, `forest-wind.m4a`: 원본 WAV(44.1kHz, 스테레오)를 같은 크기로 들리도록 음량만 맞춘 뒤(-24 LUFS, 귀뚜라미 +3.2dB, 바람 +16dB) AAC 128kbps로 변환했습니다. 소리 내용은 바꾸지 않았습니다.
- 반복 재생 시 앞뒤의 무음·페이드 구간은 앱이 재생하지 않습니다. 원본 파일은 자르지 않았습니다. 설정값은 `src/audio/sounds.ts`에 있습니다.


## 나무 풍경 효과음 (wood_tap_01~10)
- 출처: 쉼표 나무 풍경 자산 v1 (프로젝트 소유자 제공, 패키지 제작 중 직접 합성한 원본 효과음, 외부 녹음·샘플 미사용)
- 변환: 원본 44.1kHz WAV → 끝의 무음 제거, 모노 AAC 64kbps(m4a). 원본 안내는 design/windchime/README.md


## 숲 거닐기 장소 소리·발소리 (assets/sounds/walk)
- 출처: 쉼표 숲·동굴 통합 자산 v1 (프로젝트 소유자 제공, 패키지 제작 중 합성한 프로토타입 음원, 외부 녹음 미사용). 실제 자연 녹음으로 교체 예정
- 변환: 22.05kHz 모노 WAV → AAC 64kbps(m4a)

## 동굴 화면 밖 타닥 소리
- 코드로 만든 60초 반복음(`src/audio/caveSound.web.ts`의 makeCrackleBuffer). 녹음 없음, 라이선스 걱정 없음

## 음악 (Pixabay Content License)
앱 안 사용·상업 사용 무료, 출처 표기 의무 없음(기록용으로 남김). 음원만 따로 재배포하거나 그대로 판매하는 것은 금지.
라이선스: https://pixabay.com/service/license-summary/
소유자가 Pixabay에서 내려받아 전달한 mp3를 m4a(AAC 128kbps)로 변환해 넣음(`assets/sounds/music/`).

| 파일 | 곡 | 원본 |
|---|---|---|
| jazz-piano-draw-me-a-night.m4a | Draw me a night (피아노 재즈, 동굴 불멍) | https://pixabay.com/music/traditional-jazz-draw-me-a-night-jazz-piano-218343/ |
| jazz-trio-background-jazz.m4a | Background Jazz (재즈 트리오, 동굴 불멍) | https://pixabay.com/music/traditional-jazz-background-jazz-458928/ |
| meditation-flute-drift.m4a | Drift (피리 명상, 숲 누워 쉬기) | https://pixabay.com/music/folk-drift-487061/ |
| meditation-vocal-om-shanti.m4a | OM SHANTI (보컬 명상, 숲 누워 쉬기) | https://pixabay.com/music/meditationspiritual-om-shanti-5240/ |

## 영상 (Mixkit Stock Video Free License)
앱·웹 안 사용 무료, 출처 표기 의무 없음. 영상 자체를 따로 재배포·판매하는 것은 금지. 라이선스: https://mixkit.co/license/#videoFree

| 파일 | 원본 | 손본 것 |
|---|---|---|
| assets/cave/fire-loop.mp4 | Firewood burning in a campfire — https://mixkit.co/free-stock-video/firewood-burning-in-a-campfire-42768/ (720p, 5초) | 끝 1초를 처음과 겹쳐 4초 반복으로(이음새 없음), 960×540, 소리 없음 |

불 가까이 보기 전용으로 요청한 Pexels 「a bonfire burning against black background」(https://www.pexels.com/video/a-bonfire-burning-against-black-background-5592479/)는 작업 환경에서 받을 수 없어 아직 넣지 못함. 받으면 같은 방식(fireClip)으로 교체.
