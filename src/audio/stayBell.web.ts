import { getContext } from './webAudio';

/**
 * 「쉬었다 갈게요」가 끝날 때 한 번 울리는 작고 부드러운 종소리 (웹)
 * 녹음 파일 없이 Web Audio로 만듦(라이선스 걱정 없음): 맑은 기음 + 배음 몇 개가 천천히 사라짐.
 * 숲소리와 같은 오디오로 섞이므로 환경음을 멈추거나 음량을 바꾸지 않음. 오디오가 잠겨 있으면 울리지 않음.
 */
export function stayBell() {
  const c = getContext();
  if (!c || c.state !== 'running') return false;
  const t = c.currentTime + 0.03;
  const out = c.createGain();
  out.gain.value = 0.22;
  out.connect(c.destination);
  // 맑은 종: 기음 660Hz, 비정수 배음(종 특유의 울림)
  const partials: [number, number, number][] = [
    [1, 1, 3.2],
    [2.76, 0.35, 1.6],
    [5.4, 0.12, 0.9],
    [0.5, 0.18, 2.4],
  ];
  for (const [ratio, amp, decay] of partials) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = 660 * ratio;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + decay + 0.05);
  }
  setTimeout(() => out.disconnect(), 3600);
  // 자동 점검용: 울린 횟수
  const w = window as unknown as { __shimpyoBell?: number };
  w.__shimpyoBell = (w.__shimpyoBell ?? 0) + 1;
  return true;
}
