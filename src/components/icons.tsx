import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

/** 가는 선 스타일로 통일한 아이콘 */
type P = { size?: number; color?: string };

export function BackIcon({ size = 22, color = colors.text }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 5l-7 7 7 7" />
    </Svg>
  );
}

export function ChevronIcon({ size = 18, color = '#8C8E80' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 5l7 7-7 7" />
    </Svg>
  );
}

export function GearIcon({ size = 24, color = colors.text }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

export function BreathIcon({ size = 24, color = colors.text }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round">
      <Path d="M3 9h11a3 3 0 1 0-3-3" />
      <Path d="M3 13h15a3 3 0 1 1-3 3" />
      <Path d="M3 17h6" />
    </Svg>
  );
}

export function CupIcon({ size = 24, color = colors.text }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 9h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9z" />
      <Path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" />
      <Path d="M8 3.5c0 1 1 1.5 1 2.5M12 3.5c0 1 1 1.5 1 2.5" />
    </Svg>
  );
}

export function MoonIcon({ size = 20, color = colors.text }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </Svg>
  );
}

export function PlayIcon({ size = 24, color = colors.white }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </Svg>
  );
}

export function PauseIcon({ size = 22, color = colors.white }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Rect x={6} y={5} width={4} height={14} rx={1.5} />
      <Rect x={14} y={5} width={4} height={14} rx={1.5} />
    </Svg>
  );
}

export function StopIcon({ size = 14, color = colors.text }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill={color}>
      <Rect x={1} y={1} width={12} height={12} rx={2} />
    </Svg>
  );
}

export function SoundOffIcon({ size = 22, color = colors.textSoft }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 9h4l5-4v14l-5-4H4z" />
      <Path d="M17 9.5l4 5M21 9.5l-4 5" />
    </Svg>
  );
}

export function SoundOnIcon({ size = 22, color = colors.textSoft }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 9h4l5-4v14l-5-4H4z" />
      <Path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <Path d="M19 6a8.5 8.5 0 0 1 0 12" />
    </Svg>
  );
}

export function CheckIcon({ size = 16, color = colors.sageDeep }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}
