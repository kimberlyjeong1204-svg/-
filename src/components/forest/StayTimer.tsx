import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useForestSpace } from './ForestSpace';
import { FOREST_TEXT, ForestButton, ForestChoiceGroup, ForestSheet } from './ui';
import { FOREST_UI } from './forestUi';
import { Toggle } from '../settingsParts';
import { formatTime } from '../../lib/useSession';
import { stayBell } from '../../audio/stayBell';
import { radius, type } from '../../theme';

/**
 * 「쉬었다 갈게요」 — 숲·동굴이 함께 쓰는 머무르기 타이머 (UI·로직 하나)
 *
 * - 숲(/forest)·동굴(/forest/cave) 메뉴의 같은 버튼 → 「얼마나 머물까요?」 1·5·10분(기본 5분), 「종소리로 알리기」, 「쉬기 시작」
 * - 쉬는 동안 화면·환경음은 그대로. 남은 시간은 가운데에 띄우지 않고 메뉴를 다시 열었을 때만(「남은 시간 04:32」 「타이머 끝내기」)
 * - 시간 계산: 종료 시각을 기록하고 현재 시각과의 차이로 계산(1초씩 빼지 않음) → 탭을 벗어났다 와도 실제 경과 반영
 * - 끝: 화면이 열려 있고 제때 알아챘고, 「종소리로 알리기」가 켜져 있고, 지금 앱 소리가 켜져 있으면 종소리 한 번.
 *   잠금·백그라운드 중에 지났으면 돌아왔을 때 안내만(늦은 종소리 없음). 안내: 「잠깐 쉬어갔어요.」 「조금 더 머물기」
 * - 다른 장소(숲↔동굴, 홈·거닐기·숨 고르기)로 가면 취소. 동굴 전체 ↔ 불 가까이 보기는 같은 장소라 유지
 * - 새로고침·탭 닫기 후에는 복원하지 않음(저장하지 않음)
 */

export type StayPlace = 'forest' | 'cave';
export const STAY_MINUTES = [1, 5, 10] as const;
/** 끝난 시각에서 이만큼 안에 알아채야 「제때」로 보고 종소리를 울림 */
const ON_TIME_MS = 2000;

type Running = { endAt: number; place: StayPlace; chime: boolean; id: number };
type Ctx = {
  running: Running | null;
  /** 지금 장소에서 시작할 수 있으면 그 장소 */
  place: StayPlace | null;
  start: (minutes: number, chime: boolean) => void;
  cancel: () => void;
  openSheet: () => void;
};

const StayCtx = createContext<Ctx | null>(null);

export function useStayTimer() {
  const c = useContext(StayCtx);
  if (!c) throw new Error('StayTimerProvider 안에서만 쓸 수 있어요');
  return c;
}

const placeOf = (path: string): StayPlace | null => (path === '/forest' ? 'forest' : path === '/forest/cave' ? 'cave' : null);

const isVisible = () => (Platform.OS === 'web' ? typeof document === 'undefined' || document.visibilityState === 'visible' : AppState.currentState === 'active');
const msMul = () => (globalThis as { __SHIMPYO_STAY_MS?: number }).__SHIMPYO_STAY_MS ?? 60_000; // 점검용: 1분 길이

export function StayTimerProvider({ children }: { children: ReactNode }) {
  const { soundOn, wakeUi } = useForestSpace();
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const pathname = usePathname();
  const place = placeOf(pathname);
  const [running, setRunning] = useState<Running | null>(null);
  const [done, setDone] = useState(false);
  const [sheet, setSheet] = useState(false);
  const nextId = useRef(1);

  const start = useCallback(
    (minutes: number, chime: boolean) => {
      if (!place) return;
      setDone(false);
      setRunning({ endAt: Date.now() + minutes * msMul(), place, chime, id: nextId.current++ });
    },
    [place],
  );
  const cancel = useCallback(() => setRunning(null), []);

  // 다른 장소로 가면 취소(안내도 닫음). 동굴 전체 ↔ 불 가까이 보기는 같은 주소라 유지
  useEffect(() => {
    if (running && running.place !== place) setRunning(null);
    if (!place) setDone(false);
    setSheet(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place]);

  // 끝 확인: 끝나는 시각에 한 번 + 화면이 다시 보일 때
  useEffect(() => {
    if (!running) return;
    const finish = () => {
      const now = Date.now();
      if (now < running.endAt) return false;
      const onTime = isVisible() && now - running.endAt < ON_TIME_MS;
      if (onTime && running.chime && soundRef.current) stayBell();
      setRunning((r) => (r && r.id === running.id ? null : r));
      setDone(true);
      wakeUi();
      return true;
    };
    let t: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      if (t) clearTimeout(t);
      const left = running.endAt - Date.now();
      t = setTimeout(() => {
        if (!finish()) arm();
      }, Math.max(0, left) + 20);
    };
    arm();
    const onVis = () => {
      if (isVisible() && !finish()) arm();
    };
    let sub: { remove: () => void } | null = null;
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
    else sub = AppState.addEventListener('change', onVis);
    return () => {
      if (t) clearTimeout(t);
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
      sub?.remove();
    };
  }, [running, wakeUi]);

  // 숲 공간을 떠나면(홈 등) 모두 정리
  useEffect(() => () => setRunning(null), []);

  // 점검용 상태
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    (window as unknown as { __shimpyoStay?: () => unknown }).__shimpyoStay = () => ({ running: running ? { ...running, leftMs: running.endAt - Date.now() } : null, done });
  });

  return (
    <StayCtx.Provider value={{ running, place, start, cancel, openSheet: () => setSheet(true) }}>
      {children}
      <StaySheet open={sheet} onClose={() => setSheet(false)} />
      {done && (
        <View style={styles.doneWrap} pointerEvents="box-none">
          <View style={styles.doneCard} accessibilityRole="alert">
            <Text style={FOREST_TEXT.closing}>잠깐 쉬어갔어요.</Text>
            <ForestButton label="조금 더 머물기" variant="solid" size="sm" onPress={() => setDone(false)} />
          </View>
        </View>
      )}
    </StayCtx.Provider>
  );
}

/** 남은 시간(초) — 보일 때만 1초마다 다시 계산 */
function useLeftSec(running: Running | null) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return running ? Math.max(0, Math.ceil((running.endAt - Date.now()) / 1000)) : 0;
}

/** 숲·동굴 메뉴에 넣는 버튼. 실행 중이면 남은 시간과 「타이머 끝내기」도 */
export function StayTimerMenu() {
  const { running, place, cancel, openSheet } = useStayTimer();
  const left = useLeftSec(running);
  if (!place) return null;
  return (
    <>
      <ForestButton label="쉬었다 갈게요" size="sm" variant="solid" onPress={openSheet} accessibilityHint={running ? '남은 시간을 보여 줘요' : '얼마나 머물지 고르고 쉬어요'} />
      {running && (
        <View style={styles.menuRunning}>
          <Text style={FOREST_TEXT.caption} accessibilityLabel={`남은 시간 ${formatTime(left)}`}>
            남은 시간 {formatTime(left)}
          </Text>
          <ForestButton label="타이머 끝내기" size="sm" variant="quiet" onPress={cancel} accessibilityHint="종소리 없이 끝내고 이 자리에 머물러요" />
        </View>
      )}
    </>
  );
}

function StaySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { running, start, cancel } = useStayTimer();
  const { soundOn } = useForestSpace();
  const [minutes, setMinutes] = useState<number>(5);
  const [chime, setChime] = useState(soundOn);
  const left = useLeftSec(running);
  // 열 때마다: 기본 5분, 종소리는 지금 앱 소리 상태대로
  useEffect(() => {
    if (open) {
      setMinutes(5);
      setChime(soundOn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return (
    <ForestSheet open={open} onClose={onClose} title={running ? '쉬는 중' : '얼마나 머물까요?'} closeLabel="쉬었다 갈게요 닫기">
      {running ? (
        <View style={styles.body}>
          <Text style={styles.left} accessibilityLabel={`남은 시간 ${formatTime(left)}`}>
            남은 시간 {formatTime(left)}
          </Text>
          <ForestButton
            label="타이머 끝내기"
            variant="solid"
            size="md"
            onPress={() => {
              cancel();
              onClose();
            }}
          />
        </View>
      ) : (
        <View style={styles.body}>
          <ForestChoiceGroup label="머무는 시간" showLabel={false} align="center" options={STAY_MINUTES.map((m) => ({ value: m as number, label: `${m}분` }))} value={minutes} onChange={setMinutes} />
          <View style={styles.row}>
            <Text style={styles.label}>종소리로 알리기</Text>
            <Toggle value={chime} onChange={setChime} label="종소리로 알리기" />
          </View>
          <ForestButton
            label="쉬기 시작"
            variant="primary"
            size="md"
            onPress={() => {
              start(minutes, chime);
              onClose();
            }}
          />
          <Text style={styles.note}>화면을 열어두면 끝날 때 알려드려요</Text>
        </View>
      )}
    </ForestSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16, paddingTop: 4 },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { ...type.bodyStrong, color: FOREST_UI.ink },
  left: { ...type.bodyStrong, fontSize: 20, color: FOREST_UI.ink, textAlign: 'center', fontVariant: ['tabular-nums'] },
  note: { ...type.caption, color: FOREST_UI.inkSoft, textAlign: 'center' },
  menuRunning: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  doneWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  doneCard: { width: '100%', maxWidth: 320, padding: 22, gap: 16, borderRadius: radius.lg, backgroundColor: 'rgba(14, 18, 20, 0.86)', alignItems: 'center' },
});
