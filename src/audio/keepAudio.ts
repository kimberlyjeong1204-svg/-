/** 「화면을 꺼도 계속 듣기」 — iOS 앱은 아직 연결 전(웹은 keepAudio.web.ts → webAudio.ts) */
export function setKeepPlaying(_on: boolean) {}
export function setMediaHandlers(_h: { play?: () => void; pause?: () => void }) {}
