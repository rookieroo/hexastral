/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui-native/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── shadcn/rn-reusables CSS variable tokens ─────────────────────────
        // Consumed by @zhop/ui-native components via NativeWind classes.
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        // ── Domain semantic colors (周易 / 紫微) — NOT CSS variables ────────
        // These are fixed palette values used by domain components via useTheme().
        // 吉凶色系（周易）
        fortune: {
          great: '#D4AF37',   // 大吉 — 金
          good: '#22C55E',    // 吉 — 翠
          neutral: '#6B7280', // 中平 — 灰
          caution: '#F59E0B', // 小凶 — 琥珀
          bad: '#EF4444',     // 凶 — 赤
        },
        // 宫位色系（紫微）
        palace: {
          soul: '#9B59B6',    // 命宫 — 紫
          wealth: '#D4AF37',  // 财帛 — 金
          career: '#3498DB',  // 官禄 — 蓝
          spouse: '#E91E63',  // 夫妻 — 粉
          health: '#27AE60',  // 疾厄 — 绿
          fortune: '#F39C12', // 福德 — 琥珀
        },
        // 星曜亮度色系（紫微）
        star: {
          miao: '#D4AF37',  // 庙 — 金
          wang: '#22C55E',  // 旺 — 翠
          de: '#3B82F6',    // 得 — 蓝
          li: '#8B5CF6',    // 利 — 紫
          ping: '#6B7280',  // 平 — 灰
          bu: '#F59E0B',    // 不 — 琥珀
          xian: '#EF4444',  // 陷 — 赤
        },
      },
      borderRadius: {
        sm: 'calc(var(--radius) + 2px)',
        md: 'var(--radius)',
        lg: 'calc(var(--radius) + 4px)',
        xl: 'calc(var(--radius) + 6px)',
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
      },
    },
  },
  plugins: [],
}
