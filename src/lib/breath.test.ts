import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RHYTHMS, breathFrame, cubicBezier, MIN_SCALE, MAX_SCALE } from './breath.ts';

const close = (a: number, b: number, eps = 1e-3) => Math.abs(a - b) < eps;

test('cubicBezier는 양 끝이 0과 1이고 단조 증가한다', () => {
  const f = cubicBezier(0.3, 0, 0.15, 1);
  assert.equal(f(0), 0);
  assert.equal(f(1), 1);
  let prev = 0;
  for (let i = 1; i <= 100; i++) {
    const v = f(i / 100);
    assert.ok(v >= prev - 1e-9, `단조 증가가 아님: ${i}`);
    prev = v;
  }
});

for (const rhythm of Object.values(RHYTHMS)) {
  test(`${rhythm.key}: 들이쉬기가 내쉬기보다 짧다`, () => {
    assert.ok(rhythm.inhaleMs < rhythm.exhaleMs);
  });

  test(`${rhythm.key}: 시작은 가장 작고, 들이쉬기 끝에서 가장 크다`, () => {
    assert.ok(close(breathFrame(0, rhythm).scale, MIN_SCALE));
    assert.ok(breathFrame(0, rhythm).inhaling);
    assert.ok(close(breathFrame(rhythm.inhaleMs - 1, rhythm).scale, MAX_SCALE, 1e-2));
  });

  test(`${rhythm.key}: 숨 참는 구간 없이 가장 커진 직후 바로 작아진다`, () => {
    const atPeak = breathFrame(rhythm.inhaleMs, rhythm);
    const after = breathFrame(rhythm.inhaleMs + 200, rhythm);
    assert.equal(atPeak.inhaling, false);
    assert.ok(after.scale < atPeak.scale, '최고점 뒤 200ms 안에 줄어들기 시작해야 함');
  });

  test(`${rhythm.key}: 한 주기가 끝나면 처음 크기로 돌아와 이어진다`, () => {
    const period = rhythm.inhaleMs + rhythm.exhaleMs;
    assert.ok(close(breathFrame(period - 1, rhythm).scale, MIN_SCALE, 1e-2));
    const next = breathFrame(period, rhythm);
    assert.equal(next.cycle, 1);
    assert.ok(next.inhaling);
  });

  test(`${rhythm.key}: 내쉬기는 끝부분이 처음보다 훨씬 천천히 줄어든다`, () => {
    const s = (ms: number) => breathFrame(rhythm.inhaleMs + ms, rhythm).scale;
    // 가장 빨리 줄어드는 0.5초 구간과 마지막 0.5초 구간을 비교합니다.
    let fastest = 0;
    for (let ms = 0; ms + 500 <= rhythm.exhaleMs; ms += 100) fastest = Math.max(fastest, s(ms) - s(ms + 500));
    const last = s(rhythm.exhaleMs - 501) - s(rhythm.exhaleMs - 1);
    assert.ok(fastest > last * 5, `fastest=${fastest} last=${last}`);
  });
}
