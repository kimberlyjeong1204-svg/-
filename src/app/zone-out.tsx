import { Redirect } from 'expo-router';

/**
 * 예전 「멍때리기」 주소. 저장해 둔 링크로 들어와도 숲 공간의 「숲에 머물기」로 이어집니다.
 * 예전 화면(노을 배경 포함)의 코드는 src/legacy/ZoneOutScreen.tsx에 보관되어 있습니다.
 */
export default function ZoneOutRedirect() {
  return <Redirect href="/forest/stay" />;
}
