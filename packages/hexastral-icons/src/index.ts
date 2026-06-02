/**
 * @zhop/hexastral-icons — Custom icon library for HexAstral
 *
 * Three categories:
 *   - tabs:   Bottom tab bar icons per satellite app
 *   - domain: Metaphysics domain glyphs (五行, 太极, timeline, seals)
 *   - action: UI action icons (share, edit, navigate, system)
 *
 * All icons accept the same props as lucide-react-native icons
 * (size, color, strokeWidth) and are drop-in replacements.
 *
 * Usage:
 *   import { BaziIcon, ZiweiIcon, ProfileIcon } from '@zhop/hexastral-icons/tabs'
 *   import { WuxingFireIcon, YinYangIcon } from '@zhop/hexastral-icons/domain'
 *   import { ShareIcon, BrushEditIcon } from '@zhop/hexastral-icons/action'
 */

// Action icons
export {
  BackArrowIcon,
  BrushEditIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  CollapseScrollIcon,
  ExpandScrollIcon,
  LanguageIcon,
  NotificationIcon,
  OverflowIcon,
  SearchIcon,
  SettingsIcon,
  ShareIcon,
} from './action'
// Domain icons
export {
  DaYunIcon,
  LiuNianIcon,
  SealStampIcon,
  TrigramIcon,
  WuxingEarthIcon,
  WuxingFireIcon,
  WuxingMetalIcon,
  WuxingWaterIcon,
  WuxingWoodIcon,
  YinYangIcon,
} from './domain'
// Tab bar icons
export {
  AlmanacIcon,
  BaziIcon,
  BondIcon,
  DreamIcon,
  DwellingIcon,
  FaceIcon,
  HexagramIcon,
  LuopanIcon,
  MonthViewIcon,
  NumerologyIcon,
  ProfileIcon,
  ReadingsIcon,
  ZiweiIcon,
} from './tabs'
export type { IconComponent, IconProps } from './types'
