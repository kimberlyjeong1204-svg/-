/** 방문 분석 — iOS 앱에서는 보내지 않음(웹은 analytics.web.ts) */
export type AnalyticsEvent =
  | { name: 'stay_timer_start'; minutes: number; place: 'forest' | 'cave'; chime: boolean }
  | { name: 'stay_timer_complete'; minutes: number; place: 'forest' | 'cave'; chime_played: boolean };

export function initAnalytics() {}
export function trackPageView(_path: string) {}
export function trackEvent(_e: AnalyticsEvent) {}
