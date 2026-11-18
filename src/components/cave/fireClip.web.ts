import { Asset } from 'expo-asset';

/**
 * 실사 모닥불 영상(끊김 없이 이어지게 미리 만든 4초 반복)을 동굴 그림 위에 얹기 — 동굴 전체·불 가까이 보기가 함께 씀
 * - 밝기로 걸러 영상의 어두운 부분(검은 배경·그늘진 장작)은 투명하게, 불꽃·불씨만 그림 위에 남음(그림 속 돌·장작은 그대로 보임)
 * - 가장자리는 타원으로 완전히 투명해져 사각 테두리가 드러나지 않음
 * - 영상 밝기를 몇 프레임마다 재서 level()로 알려 줌 → 돌·바닥·인물 가장자리의 주황빛이 불꽃 움직임을 따라 흔들림
 * - 동굴 전체(멀리)와 불 가까이 보기가 같은 영상·같은 색 보정을 써서 색온도가 같음
 * 영상은 소리 없음(장작 소리는 caveSound). 화면이 보이지 않으면 브라우저가 알아서 멈춤.
 */
export const FIRE_CLIP = require('../../../assets/cave/fire-loop.mp4');
/** 영상에서 불꽃 바닥(장작 위)이 있는 높이 비율과 가로 중심 — 그림 속 장작 자리에 맞출 때 기준 */
export const CLIP_BASE = { x: 0.3, y: 0.78 };

export function createFireClip() {
  const video = document.createElement('video');
  video.src = Asset.fromModule(FIRE_CLIP).uri;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('muted', '');
  video.autoplay = true;
  video.preload = 'auto';
  void video.play().catch(() => {});
  const oc = document.createElement('canvas');
  oc.width = 320;
  oc.height = 180;
  const og = oc.getContext('2d', { willReadFrequently: true })!;
  const probe = document.createElement('canvas');
  probe.width = 24;
  probe.height = 14;
  const pg = probe.getContext('2d', { willReadFrequently: true })!;
  let lvl = 1;
  let frames = 0;
  let base = 0;

  const ready = () => video.readyState >= 2 && video.videoWidth > 0;

  /** 불꽃 바닥 (cx, by)에 가로 width(px) 크기로 그림. power: 장작을 넣었을 때 잠깐 크고 밝게 */
  function draw(g: CanvasRenderingContext2D, cx: number, by: number, width: number, power = 1) {
    if (!ready()) {
      if (video.paused) void video.play().catch(() => {});
      return false;
    }
    // 1) 작은 캔버스에 영상 → 밝은 곳(불꽃·불씨)만 남기고 어두운 장작·배경은 투명하게, 가장자리는 타원으로 완전히 사라지게
    og.globalCompositeOperation = 'source-over';
    og.clearRect(0, 0, oc.width, oc.height);
    og.drawImage(video, 0, 0, oc.width, oc.height);
    const img = og.getImageData(0, 0, oc.width, oc.height);
    const px = img.data;
    const W = oc.width, H = oc.height, mx = W * CLIP_BASE.x, my = H * 0.52;
    for (let yy = 0; yy < H; yy++) {
      const dy = (yy - my) / (H * 0.52);
      for (let xx = 0; xx < W; xx++) {
        const i = (yy * W + xx) * 4;
        const dx = (xx - mx) / (W * 0.5);
        const d = dx * dx + dy * dy;
        const edge = d >= 1 ? 0 : Math.min(1, (1 - d) / 0.45);
        const l = Math.max(px[i], px[i + 1], px[i + 2]) / 255;
        let a = (l - 0.3) / 0.38;
        a = a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a);
        px[i + 3] = Math.round(255 * a * edge);
      }
    }
    og.putImageData(img, 0, 0);
    // 2) 밝기 재기(불빛 일렁임용)
    if (frames++ % 4 === 0) {
      pg.drawImage(video, 0, 0, probe.width, probe.height);
      const d = pg.getImageData(0, 0, probe.width, probe.height).data;
      let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 0.4 * d[i] + 0.4 * d[i + 1] + 0.2 * d[i + 2];
      const v = s / (d.length / 4) / 255;
      base = base ? base * 0.98 + v * 0.02 : v;
      lvl = Math.max(0.7, Math.min(1.4, v / Math.max(0.05, base)));
    }
    // 3) 그림 위에 화면 섞기(어두운 곳은 사라짐), 장작을 넣으면 조금 크고 밝게
    const w = width * (1 + 0.18 * (power - 1));
    const h = (w * oc.height) / oc.width;
    const x = cx - w * CLIP_BASE.x, y = by - h * CLIP_BASE.y;
    g.save();
    g.globalCompositeOperation = 'screen';
    g.drawImage(oc, x, y, w, h);
    if (power > 1.05) {
      g.globalAlpha = Math.min(1, power - 1);
      g.drawImage(oc, x, y, w, h);
    }
    g.restore();
    return true;
  }

  return {
    draw,
    level: () => lvl,
    dispose: () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    },
  };
}
