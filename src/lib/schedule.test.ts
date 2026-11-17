import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_BEDTIME,
  DEFAULT_REST,
  REST_LIMIT,
  bedtimeSummary,
  daysLabel,
  formatHM,
  isBedtimeSettings,
  isRestSettings,
  planBedtime,
  planRest,
  restSummary,
  restTimesOfDay,
  toIosWeekday,
  type Days,
  type RestSettings,
} from './schedule.ts';

const ALL: Days = [true, true, true, true, true, true, true];

test('초기값: 2시간 간격 09–18시 → 9·11·13·15·17시, 평일 5일 = 25개', () => {
  assert.deepEqual(restTimesOfDay(DEFAULT_REST).map(formatHM), ['09:00', '11:00', '13:00', '15:00', '17:00']);
  const plan = planRest({ ...DEFAULT_REST, enabled: true });
  assert.equal(plan.problem, null);
  assert.equal(plan.alarms.length, 25);
});

test('휴식 알림 시간대는 분 단위(5분)도 그대로 쓴다', () => {
  assert.deepEqual(restTimesOfDay({ startMin: 9 * 60 + 35, endMin: 12 * 60 + 35, intervalHours: 1 }).map(formatHM), ['09:35', '10:35', '11:35', '12:35']);
  const plan = planRest({ ...DEFAULT_REST, enabled: true, startMin: 8 * 60 + 15, endMin: 10 * 60 + 15 });
  assert.equal(plan.problem, null);
  assert.ok(plan.alarms.every((a) => a.minute === 15));
});

test('한 시각에는 알림이 하나뿐이고 종류가 돌아가며 나온다', () => {
  const plan = planRest({ ...DEFAULT_REST, enabled: true });
  const keys = plan.alarms.map((a) => `${a.weekday}-${a.hour}:${a.minute}`);
  assert.equal(new Set(keys).size, keys.length, '같은 요일·시각이 겹치면 안 됨');
  assert.deepEqual(plan.alarms.slice(0, 4).map((a) => a.kind), ['rest-breath', 'rest-water', 'rest-stretch', 'rest-breath']);
});

test('매일이면 시각당 1개의 매일 반복 알림만 쓴다', () => {
  const plan = planRest({ ...DEFAULT_REST, intervalHours: 1, days: ALL });
  assert.equal(plan.alarms.length, 10);
  assert.ok(plan.alarms.every((a) => a.weekday === undefined));
});

test('1시간, 08–22시, 평일은 75개라 iOS 제한을 넘는다', () => {
  const plan = planRest({ ...DEFAULT_REST, intervalHours: 1, startMin: 8 * 60, endMin: 22 * 60 });
  assert.equal(plan.problem, 'tooMany');
  assert.ok(REST_LIMIT === 57);
});

test('1시간, 09–18시, 평일은 50개라 가능하다', () => {
  assert.equal(planRest({ ...DEFAULT_REST, intervalHours: 1 }).alarms.length, 50);
});

test('잘못된 설정을 알려 준다', () => {
  assert.equal(planRest({ ...DEFAULT_REST, types: [] }).problem, 'noTypes');
  assert.equal(planRest({ ...DEFAULT_REST, days: [false, false, false, false, false, false, false] }).problem, 'noDays');
  assert.equal(planRest({ ...DEFAULT_REST, startMin: 18 * 60, endMin: 9 * 60 }).problem, 'badRange');
});

test('숨 고르기 알림은 숨 고르기 화면으로, 나머지는 홈으로', () => {
  const plan = planRest({ ...DEFAULT_REST, types: ['breath', 'water', 'stretch', 'loose'] });
  for (const a of plan.alarms) assert.equal(a.route, a.kind === 'rest-breath' ? '/breathe' : '/');
});

test('요일 변환: 월=2 … 토=7, 일=1', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(toIosWeekday), [2, 3, 4, 5, 6, 7, 1]);
});

test('취침 알림: 평일 22:30 → 5개, 매일 → 1개, 최대 7개', () => {
  const p = planBedtime({ ...DEFAULT_BEDTIME, enabled: true });
  assert.equal(p.length, 5);
  assert.equal(p[0].hour, 22);
  assert.equal(p[0].minute, 30);
  assert.equal(planBedtime({ ...DEFAULT_BEDTIME, days: ALL }).length, 1);
});

test('요약 문구', () => {
  assert.equal(restSummary(DEFAULT_REST), '꺼짐');
  assert.equal(restSummary({ ...DEFAULT_REST, enabled: true }), '2시간마다 · 09:00–18:00 · 평일');
  assert.equal(bedtimeSummary({ ...DEFAULT_BEDTIME, enabled: true }), '22:30 · 평일');
  assert.equal(daysLabel(ALL), '매일');
  assert.equal(daysLabel([false, false, false, false, false, true, true]), '주말');
  assert.equal(daysLabel([true, false, true, false, true, false, false]), '월·수·금');
});

test('저장값 검사', () => {
  assert.ok(isRestSettings(DEFAULT_REST));
  assert.ok(isBedtimeSettings(DEFAULT_BEDTIME));
  assert.ok(!isRestSettings({ ...DEFAULT_REST, intervalHours: 4 } as unknown as RestSettings));
  assert.ok(!isRestSettings(null));
});
