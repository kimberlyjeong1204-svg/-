# 환경음 출처와 라이선스

쉼표. 앱에 포함된 환경음의 출처 기록입니다. 출처 표기는 라이선스상 필수가 아니지만 기록으로 남겨 둡니다.

| 앱 파일 | 앱 안 이름 | 원본 음원 | 길이 | 제공처 | 라이선스 |
|---|---|---|---|---|---|
| `long-rain.mp3` | 잔잔한 비 | Long rain ambience | 5:35 | [Mixkit](https://mixkit.co) | [Mixkit Sound Effects Free License](https://mixkit.co/license/modal/sfxFree/) |
| `light-rain.m4a` | 가벼운 비 | Light rain looping (Mixkit #1249) | 1:36 | [Mixkit](https://mixkit.co) | [Mixkit Sound Effects Free License](https://mixkit.co/license/modal/sfxFree/) |

- 라이선스 확인: 2026-11-16, 프로젝트 소유자가 Mixkit 공식 라이선스 페이지에서 두 음원 모두 Sound Effects Free License 적용 대상임을 확인함.
- 라이선스 요지: 상업적·비상업적 프로젝트에서 무료로 사용할 수 있으며, 다른 기능과 결합한 최종 결과물(End Product)에 포함할 수 있음.

## 사용 조건 (이 프로젝트의 원칙)

- 앱 안에서 선택형 배경음으로만 재생합니다.
- 음원 자체를 따로 판매하거나, 내려받기·내보내기·공유 기능으로 제공하지 않습니다.
- 음원을 다른 효과음 모음이나 음원 서비스에 넣지 않습니다.

## 앱에 넣으면서 바꾼 점

- `light-rain.m4a`: 원본 WAV(44.1kHz, 16bit, 스테레오)를 앱 용량을 줄이기 위해 AAC 128kbps로 변환했습니다. 소리 내용은 바꾸지 않았습니다.
- `long-rain.mp3`: 전달받은 MP3(128kbps)를 그대로 사용합니다.
- 반복 재생 시 앞뒤의 무음·페이드 구간은 앱이 재생하지 않습니다. 원본 파일은 자르지 않았습니다. 설정값은 `src/audio/sounds.ts`에 있습니다.
