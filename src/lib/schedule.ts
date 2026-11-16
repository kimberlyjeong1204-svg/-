/**
 * 휴식 알림·취침 알림 설정과 예약 계획 (순수 함수)
 *
 * iOS는 앱 하나가 미리 예약해 둘 수 있는 알림을 64개로 제한합니다.
 * - 매일 반복: 시각 하나당 알림 1개 (「매일 9시」)
 * - 일부 요일만: 요일 × 시각만큼 (「매주 월요일 9시」 …)
 * 취침 알림 몫으로 7개를 항상 비워 두고, 휴식 알림은 최대 57개까지 씁니다.
 * 그래서 취침 알림을 바꿔도 휴식 알림 설정을 다시 할 일이 없습니다.
 *
 * 한 시각에는 알림을 하나만 보내고, 여러 종류를 고르면 돌아가며 보냅니다.
 */

export type RestType = 'breath' | 'water' | 'stretch' | 'loose';

export const REST_TYPES: { key: RestType; name: string; message: string }[] = [
  { key: 'breath', name: '숨 고르기', message: '잠깐, 숨 고를 시간이에요.' },
  { key: 'water', name: '물 마시기', message: '물 한 잔 마실까요?' },
  { key: 'stretch', name: '스트레칭', message: '몸을 가볍게 움직여볼까요?' },
  { key: 'loose', name: '느슨해지기', message: '잠깐 아무것도 하지 않아도 괜찮아요.' },
];

export const BEDTIME_MESSAGE = '오늘도 수고 많으셨어요. 이제 휴대폰을 내려놓고 쉬어볼까요?';

/** 월요일부터 일요일까지 */
export const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;
export type Days = [boolean, boolean, boolean, boolean, boolean, boolean, boolean];

export type IntervalHours = 1 | 2 | 3;

export type RestSettings = {
  enabled: boolean;
  types: RestType[];
  intervalHours: IntervalHours;
  /** 0시부터 지난 분 */
  startMin: number;
  endMin: number;
  days: Days;
};

export type BedtimeSettings = {
  enabled: boolean;
  timeMin: number;
  days: Days;
};

const WEEKDAYS: Days = [true, true, true, true, true, false, false];

export const DEFAULT_REST: RestSettings = {
  enabled: false,
  types: ['breath', 'water', 'stretch'],
  intervalHours: 2,
  startMin: 9 * 60,
  endMin: 18 * 60,
  days: WEEKDAYS,
};

export const DEFAULT_BEDTIME: BedtimeSettings = {
  enabled: false,
  timeMin: 22 * 60 + 30,
  days: WEEKDAYS,
};

export const IOS_PENDING_LIMIT = 64;
export const BEDTIME_RESERVED = 7;
export const REST_LIMIT = IOS_PENDING_LIMIT - BEDTIME_RESERVED;

/** 예약할 알림 하나. weekday가 없으면 매일 반복. weekday는 1=일요일 … 7=토요일 (iOS·Expo 기준) */
export type PlannedAlarm = { weekday?: number; hour: number; minute: number; title: string; body: string; route?: string; kind: string };

export type RestProblem = 'noTypes' | 'noDays' | 'badRange' | 'tooMany';

export const REST_PROBLEM_TEXT: Record<RestProblem, string> = {
  noTypes: '알림 종류를 하나 이상 골라 주세요.',
  noDays: '반복 요일을 하나 이상 골라 주세요.',
  badRange: '끝나는 시각을 시작 시각보다 늦게 정해 주세요.',
  tooMany: '아이폰은 앱마다 미리 맞춰 둘 수 있는 알림 수가 정해져 있어요. 간격을 늘리거나 시간대를 조금 줄여 주세요.',
};

/** 월(0)~일(6) → iOS weekday(1=일 … 7=토) */
export function toIosWeekday(dayIndex: number) {
  return dayIndex === 6 ? 1 : dayIndex + 2;
}

export function formatHM(min: number) {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** 하루 중 휴식 알림 시각 (분). 시작~끝 사이, 간격마다, 끝 시각 포함 */
export function restTimesOfDay(s: Pick<RestSettings, 'startMin' | 'endMin' | 'intervalHours'>) {
  if (s.endMin <= s.startMin) return [];
  const out: number[] = [];
  for (let t = s.startMin; t <= s.endMin; t += s.intervalHours * 60) out.push(t);
  return out;
}

function orderedTypes(types: RestType[]) {
  return REST_TYPES.filter((t) => types.includes(t.key));
}

export function planRest(s: RestSettings): { problem: RestProblem | null; alarms: PlannedAlarm[]; perDay: number } {
  const types = orderedTypes(s.types);
  const times = restTimesOfDay(s);
  const dayIdx = s.days.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);

  if (types.length === 0) return { problem: 'noTypes', alarms: [], perDay: times.length };
  if (dayIdx.length === 0) return { problem: 'noDays', alarms: [], perDay: times.length };
  if (times.length === 0) return { problem: 'badRange', alarms: [], perDay: 0 };

  const make = (t: number, n: number, weekday?: number): PlannedAlarm => {
    const type = types[n % types.length];
    return {
      weekday,
      hour: Math.floor(t / 60),
      minute: t % 60,
      title: '쉼표.',
      body: type.message,
      route: type.key === 'breath' ? '/breathe' : '/',
      kind: `rest-${type.key}`,
    };
  };

  const alarms: PlannedAlarm[] = [];
  if (dayIdx.length === 7) {
    times.forEach((t, i) => alarms.push(make(t, i)));
  } else {
    let n = 0;
    for (const d of dayIdx) for (const t of times) alarms.push(make(t, n++, toIosWeekday(d)));
  }

  if (alarms.length > REST_LIMIT) return { problem: 'tooMany', alarms: [], perDay: times.length };
  return { problem: null, alarms, perDay: times.length };
}

export function planBedtime(s: BedtimeSettings): PlannedAlarm[] {
  const dayIdx = s.days.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
  const base = { hour: Math.floor(s.timeMin / 60), minute: s.timeMin % 60, title: '쉼표.', body: BEDTIME_MESSAGE, kind: 'bedtime' };
  if (dayIdx.length === 0) return [];
  if (dayIdx.length === 7) return [base];
  return dayIdx.map((d) => ({ ...base, weekday: toIosWeekday(d) }));
}

export function daysLabel(days: Days) {
  const on = days.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  if (on.length === 7) return '매일';
  if (on.length === 0) return '요일 없음';
  if (on.length === 5 && on.every((i) => i < 5)) return '평일';
  if (on.length === 2 && on[0] === 5 && on[1] === 6) return '주말';
  return on.map((i) => DAY_LABELS[i]).join('·');
}

export function restSummary(s: RestSettings) {
  if (!s.enabled) return '꺼짐';
  return `${s.intervalHours}시간마다 · ${formatHM(s.startMin)}–${formatHM(s.endMin)} · ${daysLabel(s.days)}`;
}

export function bedtimeSummary(s: BedtimeSettings) {
  if (!s.enabled) return '꺼짐';
  return `${formatHM(s.timeMin)} · ${daysLabel(s.days)}`;
}

// 저장된 값 검사 (기기 저장소에서 읽을 때)
const isDays = (v: unknown): v is Days => Array.isArray(v) && v.length === 7 && v.every((x) => typeof x === 'boolean');
const isMin = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1440;

export function isRestSettings(v: unknown): v is RestSettings {
  const o = v as RestSettings;
  return (
    !!o &&
    typeof o.enabled === 'boolean' &&
    Array.isArray(o.types) &&
    o.types.every((t) => REST_TYPES.some((r) => r.key === t)) &&
    [1, 2, 3].includes(o.intervalHours) &&
    isMin(o.startMin) &&
    isMin(o.endMin) &&
    isDays(o.days)
  );
}

export function isBedtimeSettings(v: unknown): v is BedtimeSettings {
  const o = v as BedtimeSettings;
  return !!o && typeof o.enabled === 'boolean' && isMin(o.timeMin) && isDays(o.days);
}
