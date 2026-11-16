# 쉼표.

몰입하는 일상에, 잠깐의 여유.

일이나 일상에 몰입하다 쉬는 것을 잊는 사람을 위한 iPhone 앱입니다.
React Native + Expo + TypeScript로 만듭니다.

## 지금 들어 있는 기능 (2단계)

- 홈: 숨 고르기, 멍때리기, 알림 설정으로 이동
- 숨 고르기: 들이쉬기 3초 / 내쉬기 5초 (느리게 4초 / 6초), 30초 / 1분 / 3분, 시작·일시정지·그만하기
- 멍때리기: 30초 / 1분 / 3분, 남은 시간 숨기기, 끝나면 조용히 홈으로
- 환경음: 소리 없음 / 잔잔한 비 / 가벼운 비 (기본 무음, 끝날 때 천천히 작아짐)
- 선택값(소리, 호흡 리듬, 남은 시간 숨기기)은 기기에만 저장

휴식 알림과 취침 알림은 3단계에서 만듭니다.

## Windows PC에서 iPhone으로 실행해 보기

1. PC에 [Node.js LTS](https://nodejs.org)와 [Git](https://git-scm.com)을 설치합니다.
2. iPhone에 App Store에서 **Expo Go** 앱을 설치합니다.
3. PC의 명령 프롬프트(또는 PowerShell)에서:

   ```bash
   git clone <이 저장소 주소>
   cd <저장소 폴더>
   git checkout claude/shuimpo-ios-app-h4iu78
   npm install
   npx expo start
   ```

4. 화면에 나온 QR 코드를 iPhone 카메라로 찍으면 Expo Go에서 앱이 열립니다.
   - PC와 iPhone이 같은 Wi-Fi에 있어야 합니다.
   - 연결이 안 되면 `npx expo start --tunnel`로 다시 실행합니다.

## 개발용 명령

```bash
npm run typecheck   # 타입 검사
npm test            # 호흡 리듬 계산 테스트
npx expo start      # 개발 서버
```

## 폴더 구조

```
src/app/          화면 (파일 하나가 화면 하나)
src/components/   버튼, 호흡 원, 소리 선택 등 화면 부품
src/lib/          호흡 리듬 계산, 타이머, 기기 저장
src/audio/        환경음 목록과 재생기
assets/sounds/    환경음 파일과 출처 기록(CREDITS.md)
```

## 환경음 출처

[assets/sounds/CREDITS.md](assets/sounds/CREDITS.md)를 참고하세요. 두 음원 모두 Mixkit Sound Effects Free License로 제공되며, 앱 안의 배경음으로만 사용합니다.
