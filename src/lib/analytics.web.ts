/**
 * 방문 분석 (웹, GA4 측정 ID G-W9X8CVFTR2, gtag.js)
 *
 * - 운영 주소(shimpyo-six.vercel.app)에서만 켜짐. 프리뷰·로컬·iOS 앱에서는 아무것도 보내지 않음
 * - 페이지 조회: 자동 page_view는 끄고(send_page_view: false), 화면 주소가 바뀔 때마다 직접 page_view 한 번
 *   (같은 주소 연속이면 건너뜀, 첫 접속 포함). 주소는 경로만 보냄(물음표 뒤 값 없음)
 *   → GA4 데이터 스트림의 향상된 측정 중 「브라우저 기록 이벤트 기반 페이지 변경」은 꺼야 중복이 없음(docs/ANALYTICS.md)
 * - 이벤트: 정해 둔 이름·값만 보냄(trackEvent). 사용자가 적은 글(동굴 「마음에 걸린 것」 등)은 절대 보내지 않음:
 *   값은 숫자·참거짓·정해진 짧은 낱말만 통과
 */
export const GA_ID = 'G-W9X8CVFTR2';
const PROD_HOSTS = ['shimpyo-six.vercel.app'];

type W = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; __shimpyoAnalyticsForce?: boolean };

let started = false;
let lastPath: string | null = null;

// 점검 모드: 주소에 ?ga_debug=1을 붙여 열면 화면 아래에 분석 상태가 작게 보이고, GA4 DebugView에도 표시됨
let debug = false;
let status: 'loading' | 'loaded' | 'blocked' = 'loading';
let sent = 0;
let lastSent = '';
function showDebug() {
  if (!debug) return;
  let el = document.getElementById('shimpyo-ga-debug');
  if (!el) {
    el = document.createElement('div');
    el.id = 'shimpyo-ga-debug';
    el.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.78);color:#fff;font:12px/1.4 -apple-system,sans-serif;pointer-events:none';
    document.body.appendChild(el);
  }
  const label = status === 'loaded' ? '불러옴' : status === 'blocked' ? '차단됨(이 브라우저가 Google 분석을 막고 있어요)' : '불러오는 중';
  el.textContent = `GA4 ${GA_ID} · 스크립트 ${label} · 보낸 이벤트 ${sent}개 · 마지막 ${lastSent} · ${window.location.hostname}`;
}

function enabled() {
  if (typeof window === 'undefined') return false;
  const w = window as W;
  return w.__shimpyoAnalyticsForce === true || PROD_HOSTS.includes(window.location.hostname);
}

function gtag(...args: unknown[]) {
  const w = window as W;
  w.dataLayer = w.dataLayer || [];
  // gtag.js는 arguments 객체 그대로를 받음
  // eslint-disable-next-line prefer-rest-params
  w.dataLayer.push(arguments);
  void args;
}

/** 앱이 처음 열릴 때 한 번: gtag.js 불러오기 */
export function initAnalytics() {
  if (typeof window !== 'undefined' && /[?&]ga_debug=1/.test(window.location.search)) debug = true;
  if (started || !enabled()) {
    if (debug && !enabled()) {
      status = 'blocked';
      lastSent = '운영 주소가 아니라 보내지 않음';
      setTimeout(showDebug, 500);
    }
    return;
  }
  started = true;
  (window as W).gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID, debug ? { send_page_view: false, debug_mode: true } : { send_page_view: false });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  s.onload = () => {
    status = 'loaded';
    showDebug();
  };
  s.onerror = () => {
    status = 'blocked';
    showDebug();
  };
  document.head.appendChild(s);
  setTimeout(showDebug, 500);
}

/** 화면 주소가 바뀔 때(첫 화면 포함) */
export function trackPageView(path: string) {
  if (!enabled()) return;
  initAnalytics();
  const clean = path.split('?')[0].split('#')[0] || '/';
  if (clean === lastPath) return;
  lastPath = clean;
  gtag('event', 'page_view', {
    page_path: clean,
    page_location: window.location.origin + clean,
    page_title: document.title,
  });
  sent += 1;
  lastSent = `page_view ${clean}`;
  showDebug();
}

/** 보낼 수 있는 이벤트와 값(정해 둔 것만). 글자 입력은 받지 않음 */
export type AnalyticsEvent =
  | { name: 'stay_timer_start'; minutes: number; place: 'forest' | 'cave'; chime: boolean }
  | { name: 'stay_timer_complete'; minutes: number; place: 'forest' | 'cave'; chime_played: boolean };

export function trackEvent(e: AnalyticsEvent) {
  if (!enabled()) return;
  initAnalytics();
  const { name, ...params } = e;
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'number' || typeof v === 'boolean' || (typeof v === 'string' && /^[a-z_]{1,20}$/.test(v))) safe[k] = v;
  }
  gtag('event', name, safe);
  sent += 1;
  lastSent = name;
  showDebug();
}
