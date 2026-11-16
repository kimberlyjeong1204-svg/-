import { router } from 'expo-router';

/** 이전 화면으로. 알림 등으로 바로 들어와 이전 화면이 없으면 홈으로 갑니다. */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** 휴식을 마치고 홈으로 */
export function goHome() {
  if (router.canGoBack()) router.dismissTo('/');
  else router.replace('/');
}
