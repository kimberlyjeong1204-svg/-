import { Platform, Share } from 'react-native';

/**
 * 숲 선물하기 — 쉼표로 들어오는 링크를 나눔. 로그인·서버·기록 없음(링크만 보냄).
 * - 웹: 휴대폰 기본 공유(Web Share API). 없으면 링크 복사
 * - iOS 앱: 시스템 공유 창. 웹 주소는 EXPO_PUBLIC_WEB_URL(예: https://쉼표주소)로 정함
 */
export const GIFT_TITLE = '쉼표. 작은 숲 선물';
export const GIFT_TEXT = '잠깐 쉬어 갈 수 있는 작은 숲을 보내요.';

export type GiftResult = 'shared' | 'copied' | 'cancelled' | 'failed';

function giftUrl(): string | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/gift`;
  const base = process.env.EXPO_PUBLIC_WEB_URL;
  return base ? `${base.replace(/\/$/, '')}/gift` : null;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 아래 방법으로
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function shareForest(): Promise<GiftResult> {
  const url = giftUrl();
  if (Platform.OS === 'web') {
    if (!url) return 'failed';
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };
    const data = { title: GIFT_TITLE, text: GIFT_TEXT, url };
    if (nav.share && (!nav.canShare || nav.canShare(data))) {
      try {
        await nav.share(data);
        return 'shared';
      } catch (e) {
        if ((e as { name?: string })?.name === 'AbortError') return 'cancelled';
        // 공유가 막히면 복사로
      }
    }
    return (await copyText(url)) ? 'copied' : 'failed';
  }
  try {
    const r = await Share.share({ title: GIFT_TITLE, message: url ? `${GIFT_TEXT}\n${url}` : GIFT_TEXT, url: url ?? undefined });
    return r.action === Share.dismissedAction ? 'cancelled' : 'shared';
  } catch {
    return 'failed';
  }
}
