/**
 * Shared icon props — drop-in compatible with lucide-react-native's LucideIcon
 * interface so existing SatelliteTabLayout code works without changes.
 */
import type { SvgProps } from 'react-native-svg'

export interface IconProps extends Omit<SvgProps, 'width' | 'height'> {
  /** Render size (both width and height). Default 24. */
  size?: number
  /** Stroke / fill color. Default "currentColor". */
  color?: string
  /** Stroke width. Default 1.5. */
  strokeWidth?: number
}

/** A component that conforms to the icon interface (same shape as LucideIcon). */
export type IconComponent = (props: IconProps) => React.JSX.Element
