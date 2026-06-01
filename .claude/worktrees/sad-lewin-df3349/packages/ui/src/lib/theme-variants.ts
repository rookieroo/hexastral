/**
 * Theme Variants - 主题变体定义
 * 支持 4 个预设主题：Athletic, Minimal, Tech, Fashion
 */

export type ThemeVariant = 'athletic' | 'minimal' | 'tech' | 'fashion'

/**
 * 主题变体映射
 * 用于 CVA 的 theme variant
 */
export const themeVariants = {
  athletic: {
    name: 'Athletic',
    description: 'Bold, energetic design for sports & fitness brands (Gymshark style)',
    primary: 'bg-black text-white',
    accent: 'bg-white text-black',
    font: 'font-black uppercase tracking-tight',
  },
  minimal: {
    name: 'Minimal',
    description: 'Clean, serif-based design for beauty & lifestyle (Aesop style)',
    primary: 'bg-[#FFFEF2] text-[#333]',
    accent: 'border-[#333] text-[#333]',
    font: 'font-serif font-light',
  },
  tech: {
    name: 'Tech',
    description: 'Industrial, dot-matrix design for tech brands (Nothing style)',
    primary: 'bg-[#f0f0f0] text-black',
    accent: 'bg-black text-white',
    font: 'font-mono font-bold uppercase',
  },
  fashion: {
    name: 'Fashion',
    description: 'Editorial, elegant design for apparel brands (COS style)',
    primary: 'bg-[#F5F5F0] text-[#1a1a1a]',
    accent: 'border-[#1a1a1a] text-[#1a1a1a]',
    font: 'font-light tracking-wide',
  },
} as const

/**
 * 获取主题配置
 */
export function getThemeConfig(theme: ThemeVariant) {
  return themeVariants[theme]
}
