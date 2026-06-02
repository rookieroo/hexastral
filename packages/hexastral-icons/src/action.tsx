/**
 * UI action icons — navigation, editing, sharing, system actions.
 *
 * These replace standard lucide icons with designs that feel cohesive
 * within the HexAstral brand: slightly organic stroke weight, rounded
 * terminals, subtle asymmetry where natural.
 */
import Svg, { Circle, Path } from 'react-native-svg'
import type { IconProps } from './types'

/**
 * ExpandScrollIcon (展开 — unfurl the reading)
 *
 * A scroll being unrolled — two small curls at top and bottom with
 * the page expanding between them. Used for "open 命书" CTA.
 */
export function ExpandScrollIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      {/* top scroll curl */}
      <Path
        d='M7 4c0-1 1-2 2.5-2h5c1.5 0 2.5 1 2.5 2'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
      />
      {/* scroll body */}
      <Path
        d='M7 4v16c0 1 1 2 2.5 2h5c1.5 0 2.5-1 2.5-2V4'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin='round'
      />
      {/* expand arrows — centre, pointing out */}
      <Path
        d='M12 8v8M9 10.5L12 8l3 2.5M9 13.5l3 3 3-3'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </Svg>
  )
}

/**
 * ShareIcon (分享)
 *
 * Branch with outward arrow — a node forking into two paths,
 * with a subtle upward trajectory suggesting "sending out".
 */
export function ShareIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      {/* top node */}
      <Circle cx={18} cy={5} r={2.5} stroke={color} strokeWidth={strokeWidth} />
      {/* middle node (origin) */}
      <Circle cx={6} cy={12} r={2.5} stroke={color} strokeWidth={strokeWidth} />
      {/* bottom node */}
      <Circle cx={18} cy={19} r={2.5} stroke={color} strokeWidth={strokeWidth} />
      {/* connecting lines */}
      <Path
        d='M8.3 10.8l7.4-4.6M8.3 13.2l7.4 4.6'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
      />
    </Svg>
  )
}

/**
 * BrushEditIcon (编辑 — calligraphy brush)
 *
 * A Chinese calligraphy brush (毛笔) — tapered body, bristle tip.
 * Oriented at a natural writing angle (~30 degrees from vertical).
 */
export function BrushEditIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      {/* brush body — long taper */}
      <Path
        d='M16 2.5L6 17l1.5 2L18 4.5c.5-.5.5-1.5-2-2z'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin='round'
      />
      {/* bristle tip */}
      <Path
        d='M6 17c-.5 1-1 2.5-1 3.5 0 .5.3 1 1 1s1.5-.5 2-1.5L7.5 19'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      {/* ink mark — small dot where brush meets paper */}
      <Circle cx={5.5} cy={21} r={0.8} fill={color} opacity={0.5} />
    </Svg>
  )
}

/**
 * LanguageIcon (语言切换)
 *
 * Globe with 文 character overlay — represents i18n / locale switching.
 * The globe is minimal (two arcs + equator), with a small 文 mark.
 */
export function LanguageIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      {/* globe circle */}
      <Circle cx={12} cy={12} r={9.5} stroke={color} strokeWidth={strokeWidth} />
      {/* equator */}
      <Path d='M3 12h18' stroke={color} strokeWidth={strokeWidth * 0.7} strokeLinecap='round' />
      {/* meridian arcs */}
      <Path
        d='M12 2.5c-3 2-4.5 5-4.5 9.5s1.5 7.5 4.5 9.5'
        stroke={color}
        strokeWidth={strokeWidth * 0.7}
      />
      <Path
        d='M12 2.5c3 2 4.5 5 4.5 9.5s-1.5 7.5-4.5 9.5'
        stroke={color}
        strokeWidth={strokeWidth * 0.7}
      />
      {/* latitude line */}
      <Path
        d='M5.5 7h13M5.5 17h13'
        stroke={color}
        strokeWidth={strokeWidth * 0.5}
        strokeLinecap='round'
        opacity={0.4}
      />
    </Svg>
  )
}

/**
 * BackArrowIcon (返回)
 *
 * Left-pointing arrow with a slight organic curve — not a rigid chevron,
 * but a brushstroke-like sweep.
 */
export function BackArrowIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      <Path
        d='M10 5L3 12l7 7'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <Path d='M3 12h17' stroke={color} strokeWidth={strokeWidth} strokeLinecap='round' />
    </Svg>
  )
}

/**
 * CloseIcon (关闭)
 *
 * X mark with slightly organic stroke ends.
 */
export function CloseIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      <Path
        d='M6 6l12 12M18 6L6 18'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
      />
    </Svg>
  )
}

/**
 * SettingsIcon (设置)
 *
 * Three horizontal sliders — each at a different position, representing
 * adjustable parameters. Cleaner than a gear, more unique.
 */
export function SettingsIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      {/* slider tracks */}
      <Path
        d='M4 6h16M4 12h16M4 18h16'
        stroke={color}
        strokeWidth={strokeWidth * 0.6}
        strokeLinecap='round'
        opacity={0.3}
      />
      {/* slider knobs — each at different position */}
      <Circle cx={15} cy={6} r={2} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={8} cy={12} r={2} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={13} cy={18} r={2} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  )
}

/**
 * NotificationIcon (通知 — bell)
 *
 * Traditional bell shape with a clapper dot. The bell has an organic,
 * slightly asymmetric profile.
 */
export function NotificationIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      {/* bell body */}
      <Path
        d='M10 3.5c0-.8.9-1.5 2-1.5s2 .7 2 1.5M6 10c0-3.3 2.7-6 6-6s6 2.7 6 6v4l2 3H4l2-3v-4z'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin='round'
      />
      {/* clapper */}
      <Path
        d='M9.5 19c.5 1.5 1.3 2.5 2.5 2.5s2-1 2.5-2.5'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
      />
    </Svg>
  )
}

/**
 * ChevronDownIcon (展开更多)
 */
export function ChevronDownIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      <Path
        d='M6 9l6 6 6-6'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </Svg>
  )
}

/**
 * ChevronRightIcon (进入)
 */
export function ChevronRightIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      <Path
        d='M9 6l6 6-6 6'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </Svg>
  )
}

/**
 * SearchIcon (搜索)
 *
 * Magnifying glass with slight organic handle angle.
 */
export function SearchIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={strokeWidth} />
      <Path d='M16.5 16.5L21 21' stroke={color} strokeWidth={strokeWidth} strokeLinecap='round' />
    </Svg>
  )
}

/**
 * OverflowIcon (更多 — three dots)
 *
 * Vertical ellipsis for a "more actions" affordance. Filled dots read more
 * clearly at small sizes than stroked rings; kept perfectly aligned so it is
 * instantly recognizable as an overflow menu rather than decoration.
 */
export function OverflowIcon({ size = 24, color = 'currentColor', ...rest }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      <Circle cx={12} cy={5} r={1.7} fill={color} />
      <Circle cx={12} cy={12} r={1.7} fill={color} />
      <Circle cx={12} cy={19} r={1.7} fill={color} />
    </Svg>
  )
}

/**
 * CollapseScrollIcon (收起)
 *
 * A scroll being rolled up — arrows pointing inward.
 */
export function CollapseScrollIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' {...rest}>
      {/* scroll body */}
      <Path
        d='M7 4c0-1 1-2 2.5-2h5c1.5 0 2.5 1 2.5 2v16c0 1-1 2-2.5 2h-5C8 22 7 21 7 20V4z'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin='round'
      />
      {/* collapse arrows — pointing inward */}
      <Path
        d='M9 7.5L12 10.5l3-3M9 16.5l3-3 3 3'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </Svg>
  )
}
