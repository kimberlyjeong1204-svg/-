/**
 * 웹앱(PWA): 서비스 워커를 등록해 홈 화면에 추가한 뒤에도 빠르게 열리고,
 * 한 번 연 화면은 인터넷이 끊겨도 열리게 합니다.
 * 개발 서버(개발 모드)에서는 캐시가 헷갈리지 않도록 등록하지 않습니다.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV !== 'production') return;
  const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
  // 화면 코드가 늦게 불러와져 load 이벤트가 이미 지났을 수 있습니다.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
