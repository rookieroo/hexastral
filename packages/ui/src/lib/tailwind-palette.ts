/**
 * Tailwind CSS v4 Default Color Palette
 *
 * Official colors from https://tailwindcss.com/docs/colors
 * Each color family includes 11 shades (50–950) with both oklch and hex values.
 *
 * Usage:
 * - Theme presets use `500` as primary and `600` as the hover/dark variant
 * - `50/100` for light backgrounds, `900/950` for dark text/backgrounds
 * - Hex values are used in `styleOverride` → CSS var injection
 * - oklch values match what Tailwind v4 generates natively
 *
 * @see packages/ui/src/lib/theme-options.ts - THEME_PRESETS consume this palette
 * @see apps/web/lib/puck/config.ts - styleOverrideToCSSVars() sets CSS vars from hex
 */

export interface ColorShade {
  /** oklch value (native Tailwind v4 format) */
  oklch: string
  /** Hex approximation for use in color pickers and styleOverride */
  hex: string
}

export interface ColorFamily {
  id: string
  label: string
  shades: Record<number, ColorShade>
}

/**
 * Complete Tailwind CSS v4 color palette
 *
 * 22 color families × 11 shades = 242 colors
 * Ordered to match https://tailwindcss.com/docs/colors
 */
export const TAILWIND_COLORS: ColorFamily[] = [
  // ── Warm Colors ──────────────────────────────────────────────────────────
  {
    id: 'red',
    label: 'Red',
    shades: {
      50: { oklch: 'oklch(0.971 0.013 17.38)', hex: '#fef2f2' },
      100: { oklch: 'oklch(0.936 0.032 17.717)', hex: '#fee2e2' },
      200: { oklch: 'oklch(0.885 0.062 18.334)', hex: '#fecaca' },
      300: { oklch: 'oklch(0.808 0.114 19.571)', hex: '#fca5a5' },
      400: { oklch: 'oklch(0.704 0.191 22.216)', hex: '#f87171' },
      500: { oklch: 'oklch(0.637 0.237 25.331)', hex: '#ef4444' },
      600: { oklch: 'oklch(0.577 0.245 27.325)', hex: '#dc2626' },
      700: { oklch: 'oklch(0.505 0.213 27.518)', hex: '#b91c1c' },
      800: { oklch: 'oklch(0.444 0.177 26.899)', hex: '#991b1b' },
      900: { oklch: 'oklch(0.396 0.141 25.723)', hex: '#7f1d1d' },
      950: { oklch: 'oklch(0.258 0.092 26.042)', hex: '#450a0a' },
    },
  },
  {
    id: 'orange',
    label: 'Orange',
    shades: {
      50: { oklch: 'oklch(0.98 0.016 73.684)', hex: '#fff7ed' },
      100: { oklch: 'oklch(0.954 0.038 75.164)', hex: '#ffedd5' },
      200: { oklch: 'oklch(0.901 0.076 70.697)', hex: '#fed7aa' },
      300: { oklch: 'oklch(0.837 0.128 66.29)', hex: '#fdba74' },
      400: { oklch: 'oklch(0.75 0.183 55.934)', hex: '#fb923c' },
      500: { oklch: 'oklch(0.705 0.213 47.604)', hex: '#f97316' },
      600: { oklch: 'oklch(0.646 0.222 41.116)', hex: '#ea580c' },
      700: { oklch: 'oklch(0.553 0.195 38.402)', hex: '#c2410c' },
      800: { oklch: 'oklch(0.47 0.157 37.304)', hex: '#9a3412' },
      900: { oklch: 'oklch(0.408 0.123 38.172)', hex: '#7c2d12' },
      950: { oklch: 'oklch(0.266 0.079 36.259)', hex: '#431407' },
    },
  },
  {
    id: 'amber',
    label: 'Amber',
    shades: {
      50: { oklch: 'oklch(0.987 0.022 95.277)', hex: '#fffbeb' },
      100: { oklch: 'oklch(0.962 0.059 95.617)', hex: '#fef3c7' },
      200: { oklch: 'oklch(0.924 0.12 95.746)', hex: '#fde68a' },
      300: { oklch: 'oklch(0.879 0.169 91.605)', hex: '#fcd34d' },
      400: { oklch: 'oklch(0.828 0.189 84.429)', hex: '#fbbf24' },
      500: { oklch: 'oklch(0.769 0.188 70.08)', hex: '#f59e0b' },
      600: { oklch: 'oklch(0.666 0.179 58.318)', hex: '#d97706' },
      700: { oklch: 'oklch(0.555 0.163 48.998)', hex: '#b45309' },
      800: { oklch: 'oklch(0.473 0.137 46.201)', hex: '#92400e' },
      900: { oklch: 'oklch(0.414 0.112 45.904)', hex: '#78350f' },
      950: { oklch: 'oklch(0.279 0.077 45.635)', hex: '#451a03' },
    },
  },
  {
    id: 'yellow',
    label: 'Yellow',
    shades: {
      50: { oklch: 'oklch(0.987 0.026 102.212)', hex: '#fefce8' },
      100: { oklch: 'oklch(0.973 0.071 103.193)', hex: '#fef9c3' },
      200: { oklch: 'oklch(0.945 0.129 101.54)', hex: '#fef08a' },
      300: { oklch: 'oklch(0.905 0.182 98.111)', hex: '#fde047' },
      400: { oklch: 'oklch(0.852 0.199 91.936)', hex: '#facc15' },
      500: { oklch: 'oklch(0.795 0.184 86.047)', hex: '#eab308' },
      600: { oklch: 'oklch(0.681 0.162 75.834)', hex: '#ca8a04' },
      700: { oklch: 'oklch(0.554 0.135 66.442)', hex: '#a16207' },
      800: { oklch: 'oklch(0.476 0.114 61.907)', hex: '#854d0e' },
      900: { oklch: 'oklch(0.421 0.095 57.708)', hex: '#713f12' },
      950: { oklch: 'oklch(0.286 0.066 53.813)', hex: '#422006' },
    },
  },

  // ── Green Colors ─────────────────────────────────────────────────────────
  {
    id: 'lime',
    label: 'Lime',
    shades: {
      50: { oklch: 'oklch(0.986 0.031 120.757)', hex: '#f7fee7' },
      100: { oklch: 'oklch(0.967 0.067 122.328)', hex: '#ecfccb' },
      200: { oklch: 'oklch(0.938 0.127 124.321)', hex: '#d9f99d' },
      300: { oklch: 'oklch(0.897 0.196 126.665)', hex: '#bef264' },
      400: { oklch: 'oklch(0.841 0.238 128.85)', hex: '#a3e635' },
      500: { oklch: 'oklch(0.768 0.233 130.85)', hex: '#84cc16' },
      600: { oklch: 'oklch(0.648 0.2 131.684)', hex: '#65a30d' },
      700: { oklch: 'oklch(0.532 0.157 131.589)', hex: '#4d7c0f' },
      800: { oklch: 'oklch(0.453 0.124 130.933)', hex: '#3f6212' },
      900: { oklch: 'oklch(0.405 0.101 131.063)', hex: '#365314' },
      950: { oklch: 'oklch(0.274 0.072 132.109)', hex: '#1a2e05' },
    },
  },
  {
    id: 'green',
    label: 'Green',
    shades: {
      50: { oklch: 'oklch(0.982 0.018 155.826)', hex: '#f0fdf4' },
      100: { oklch: 'oklch(0.962 0.044 156.743)', hex: '#dcfce7' },
      200: { oklch: 'oklch(0.925 0.084 155.995)', hex: '#bbf7d0' },
      300: { oklch: 'oklch(0.871 0.15 154.449)', hex: '#86efac' },
      400: { oklch: 'oklch(0.792 0.209 151.711)', hex: '#4ade80' },
      500: { oklch: 'oklch(0.723 0.219 149.579)', hex: '#22c55e' },
      600: { oklch: 'oklch(0.627 0.194 149.214)', hex: '#16a34a' },
      700: { oklch: 'oklch(0.527 0.154 150.069)', hex: '#15803d' },
      800: { oklch: 'oklch(0.448 0.119 151.328)', hex: '#166534' },
      900: { oklch: 'oklch(0.393 0.095 152.535)', hex: '#14532d' },
      950: { oklch: 'oklch(0.266 0.065 152.934)', hex: '#052e16' },
    },
  },
  {
    id: 'emerald',
    label: 'Emerald',
    shades: {
      50: { oklch: 'oklch(0.979 0.021 166.113)', hex: '#ecfdf5' },
      100: { oklch: 'oklch(0.95 0.052 163.051)', hex: '#d1fae5' },
      200: { oklch: 'oklch(0.905 0.093 164.15)', hex: '#a7f3d0' },
      300: { oklch: 'oklch(0.845 0.143 164.978)', hex: '#6ee7b7' },
      400: { oklch: 'oklch(0.765 0.177 163.223)', hex: '#34d399' },
      500: { oklch: 'oklch(0.696 0.17 162.48)', hex: '#10b981' },
      600: { oklch: 'oklch(0.596 0.145 163.225)', hex: '#059669' },
      700: { oklch: 'oklch(0.508 0.118 165.612)', hex: '#047857' },
      800: { oklch: 'oklch(0.432 0.095 166.913)', hex: '#065f46' },
      900: { oklch: 'oklch(0.378 0.077 168.94)', hex: '#064e3b' },
      950: { oklch: 'oklch(0.262 0.051 172.552)', hex: '#022c22' },
    },
  },
  {
    id: 'teal',
    label: 'Teal',
    shades: {
      50: { oklch: 'oklch(0.984 0.014 180.72)', hex: '#f0fdfa' },
      100: { oklch: 'oklch(0.953 0.051 180.801)', hex: '#ccfbf1' },
      200: { oklch: 'oklch(0.91 0.096 180.426)', hex: '#99f6e4' },
      300: { oklch: 'oklch(0.855 0.138 181.071)', hex: '#5eead4' },
      400: { oklch: 'oklch(0.777 0.152 181.912)', hex: '#2dd4bf' },
      500: { oklch: 'oklch(0.704 0.14 182.503)', hex: '#14b8a6' },
      600: { oklch: 'oklch(0.6 0.118 184.704)', hex: '#0d9488' },
      700: { oklch: 'oklch(0.511 0.096 186.391)', hex: '#0f766e' },
      800: { oklch: 'oklch(0.437 0.078 188.216)', hex: '#115e59' },
      900: { oklch: 'oklch(0.386 0.063 188.416)', hex: '#134e4a' },
      950: { oklch: 'oklch(0.277 0.046 192.524)', hex: '#042f2e' },
    },
  },

  // ── Blue Colors ──────────────────────────────────────────────────────────
  {
    id: 'cyan',
    label: 'Cyan',
    shades: {
      50: { oklch: 'oklch(0.984 0.019 200.873)', hex: '#ecfeff' },
      100: { oklch: 'oklch(0.956 0.045 203.388)', hex: '#cffafe' },
      200: { oklch: 'oklch(0.917 0.08 205.041)', hex: '#a5f3fc' },
      300: { oklch: 'oklch(0.865 0.127 207.078)', hex: '#67e8f9' },
      400: { oklch: 'oklch(0.789 0.154 211.53)', hex: '#22d3ee' },
      500: { oklch: 'oklch(0.715 0.143 215.221)', hex: '#06b6d4' },
      600: { oklch: 'oklch(0.609 0.126 221.723)', hex: '#0891b2' },
      700: { oklch: 'oklch(0.52 0.105 223.128)', hex: '#0e7490' },
      800: { oklch: 'oklch(0.45 0.085 224.283)', hex: '#155e75' },
      900: { oklch: 'oklch(0.398 0.07 227.392)', hex: '#164e63' },
      950: { oklch: 'oklch(0.302 0.056 229.695)', hex: '#083344' },
    },
  },
  {
    id: 'sky',
    label: 'Sky',
    shades: {
      50: { oklch: 'oklch(0.977 0.013 236.62)', hex: '#f0f9ff' },
      100: { oklch: 'oklch(0.951 0.026 236.824)', hex: '#e0f2fe' },
      200: { oklch: 'oklch(0.901 0.058 230.902)', hex: '#bae6fd' },
      300: { oklch: 'oklch(0.828 0.111 230.318)', hex: '#7dd3fc' },
      400: { oklch: 'oklch(0.746 0.16 232.661)', hex: '#38bdf8' },
      500: { oklch: 'oklch(0.685 0.169 237.323)', hex: '#0ea5e9' },
      600: { oklch: 'oklch(0.588 0.158 241.966)', hex: '#0284c7' },
      700: { oklch: 'oklch(0.5 0.134 242.749)', hex: '#0369a1' },
      800: { oklch: 'oklch(0.443 0.11 240.79)', hex: '#075985' },
      900: { oklch: 'oklch(0.391 0.09 240.876)', hex: '#0c4a6e' },
      950: { oklch: 'oklch(0.293 0.066 243.157)', hex: '#082f49' },
    },
  },
  {
    id: 'blue',
    label: 'Blue',
    shades: {
      50: { oklch: 'oklch(0.97 0.014 254.604)', hex: '#eff6ff' },
      100: { oklch: 'oklch(0.932 0.032 255.585)', hex: '#dbeafe' },
      200: { oklch: 'oklch(0.882 0.059 254.128)', hex: '#bfdbfe' },
      300: { oklch: 'oklch(0.809 0.105 251.813)', hex: '#93c5fd' },
      400: { oklch: 'oklch(0.707 0.165 254.624)', hex: '#60a5fa' },
      500: { oklch: 'oklch(0.623 0.214 259.815)', hex: '#3b82f6' },
      600: { oklch: 'oklch(0.546 0.245 262.881)', hex: '#2563eb' },
      700: { oklch: 'oklch(0.488 0.243 264.376)', hex: '#1d4ed8' },
      800: { oklch: 'oklch(0.424 0.199 265.638)', hex: '#1e40af' },
      900: { oklch: 'oklch(0.379 0.146 265.522)', hex: '#1e3a8a' },
      950: { oklch: 'oklch(0.282 0.091 267.935)', hex: '#172554' },
    },
  },
  {
    id: 'indigo',
    label: 'Indigo',
    shades: {
      50: { oklch: 'oklch(0.962 0.018 272.314)', hex: '#eef2ff' },
      100: { oklch: 'oklch(0.93 0.034 272.788)', hex: '#e0e7ff' },
      200: { oklch: 'oklch(0.87 0.065 274.039)', hex: '#c7d2fe' },
      300: { oklch: 'oklch(0.785 0.115 274.713)', hex: '#a5b4fc' },
      400: { oklch: 'oklch(0.673 0.182 276.935)', hex: '#818cf8' },
      500: { oklch: 'oklch(0.585 0.233 277.117)', hex: '#6366f1' },
      600: { oklch: 'oklch(0.511 0.262 276.966)', hex: '#4f46e5' },
      700: { oklch: 'oklch(0.457 0.24 277.023)', hex: '#4338ca' },
      800: { oklch: 'oklch(0.398 0.195 277.366)', hex: '#3730a3' },
      900: { oklch: 'oklch(0.359 0.144 278.697)', hex: '#312e81' },
      950: { oklch: 'oklch(0.257 0.09 281.288)', hex: '#1e1b4b' },
    },
  },

  // ── Purple Colors ────────────────────────────────────────────────────────
  {
    id: 'violet',
    label: 'Violet',
    shades: {
      50: { oklch: 'oklch(0.969 0.016 293.756)', hex: '#f5f3ff' },
      100: { oklch: 'oklch(0.943 0.029 294.588)', hex: '#ede9fe' },
      200: { oklch: 'oklch(0.894 0.057 293.283)', hex: '#ddd6fe' },
      300: { oklch: 'oklch(0.811 0.111 293.571)', hex: '#c4b5fd' },
      400: { oklch: 'oklch(0.702 0.183 293.541)', hex: '#a78bfa' },
      500: { oklch: 'oklch(0.606 0.25 292.717)', hex: '#8b5cf6' },
      600: { oklch: 'oklch(0.541 0.281 293.009)', hex: '#7c3aed' },
      700: { oklch: 'oklch(0.491 0.27 292.581)', hex: '#6d28d9' },
      800: { oklch: 'oklch(0.432 0.232 292.759)', hex: '#5b21b6' },
      900: { oklch: 'oklch(0.38 0.189 293.745)', hex: '#4c1d95' },
      950: { oklch: 'oklch(0.283 0.141 291.089)', hex: '#2e1065' },
    },
  },
  {
    id: 'purple',
    label: 'Purple',
    shades: {
      50: { oklch: 'oklch(0.977 0.014 308.299)', hex: '#faf5ff' },
      100: { oklch: 'oklch(0.946 0.033 307.174)', hex: '#f3e8ff' },
      200: { oklch: 'oklch(0.902 0.063 306.703)', hex: '#e9d5ff' },
      300: { oklch: 'oklch(0.827 0.119 306.383)', hex: '#d8b4fe' },
      400: { oklch: 'oklch(0.714 0.203 305.504)', hex: '#c084fc' },
      500: { oklch: 'oklch(0.627 0.265 303.9)', hex: '#a855f7' },
      600: { oklch: 'oklch(0.558 0.288 302.321)', hex: '#9333ea' },
      700: { oklch: 'oklch(0.496 0.265 301.924)', hex: '#7e22ce' },
      800: { oklch: 'oklch(0.438 0.218 303.724)', hex: '#6b21a8' },
      900: { oklch: 'oklch(0.381 0.176 304.987)', hex: '#581c87' },
      950: { oklch: 'oklch(0.291 0.149 302.717)', hex: '#3b0764' },
    },
  },
  {
    id: 'fuchsia',
    label: 'Fuchsia',
    shades: {
      50: { oklch: 'oklch(0.977 0.017 320.058)', hex: '#fdf4ff' },
      100: { oklch: 'oklch(0.952 0.037 318.852)', hex: '#fae8ff' },
      200: { oklch: 'oklch(0.903 0.076 319.62)', hex: '#f5d0fe' },
      300: { oklch: 'oklch(0.833 0.145 321.434)', hex: '#f0abfc' },
      400: { oklch: 'oklch(0.74 0.238 322.16)', hex: '#e879f9' },
      500: { oklch: 'oklch(0.667 0.295 322.15)', hex: '#d946ef' },
      600: { oklch: 'oklch(0.591 0.293 322.896)', hex: '#c026d3' },
      700: { oklch: 'oklch(0.518 0.253 323.949)', hex: '#a21caf' },
      800: { oklch: 'oklch(0.452 0.211 324.591)', hex: '#86198f' },
      900: { oklch: 'oklch(0.401 0.17 325.612)', hex: '#701a75' },
      950: { oklch: 'oklch(0.293 0.136 325.661)', hex: '#4a044e' },
    },
  },
  {
    id: 'pink',
    label: 'Pink',
    shades: {
      50: { oklch: 'oklch(0.971 0.014 343.198)', hex: '#fdf2f8' },
      100: { oklch: 'oklch(0.948 0.028 342.258)', hex: '#fce7f3' },
      200: { oklch: 'oklch(0.899 0.061 343.231)', hex: '#fbcfe8' },
      300: { oklch: 'oklch(0.823 0.12 346.018)', hex: '#f9a8d4' },
      400: { oklch: 'oklch(0.718 0.202 349.761)', hex: '#f472b6' },
      500: { oklch: 'oklch(0.656 0.241 354.308)', hex: '#ec4899' },
      600: { oklch: 'oklch(0.592 0.249 0.584)', hex: '#db2777' },
      700: { oklch: 'oklch(0.525 0.223 3.958)', hex: '#be185d' },
      800: { oklch: 'oklch(0.459 0.187 3.815)', hex: '#9d174d' },
      900: { oklch: 'oklch(0.408 0.153 2.432)', hex: '#831843' },
      950: { oklch: 'oklch(0.284 0.109 3.907)', hex: '#500724' },
    },
  },
  {
    id: 'rose',
    label: 'Rose',
    shades: {
      50: { oklch: 'oklch(0.969 0.015 12.422)', hex: '#fff1f2' },
      100: { oklch: 'oklch(0.941 0.03 12.58)', hex: '#ffe4e6' },
      200: { oklch: 'oklch(0.892 0.058 10.001)', hex: '#fecdd3' },
      300: { oklch: 'oklch(0.81 0.117 11.638)', hex: '#fda4af' },
      400: { oklch: 'oklch(0.712 0.194 13.428)', hex: '#fb7185' },
      500: { oklch: 'oklch(0.645 0.246 16.439)', hex: '#f43f5e' },
      600: { oklch: 'oklch(0.586 0.253 17.585)', hex: '#e11d48' },
      700: { oklch: 'oklch(0.514 0.222 16.935)', hex: '#be123c' },
      800: { oklch: 'oklch(0.455 0.188 13.697)', hex: '#9f1239' },
      900: { oklch: 'oklch(0.41 0.159 10.272)', hex: '#881337' },
      950: { oklch: 'oklch(0.271 0.105 12.094)', hex: '#4c0519' },
    },
  },

  // ── Neutral Colors ───────────────────────────────────────────────────────
  {
    id: 'slate',
    label: 'Slate',
    shades: {
      50: { oklch: 'oklch(0.984 0.003 247.858)', hex: '#f8fafc' },
      100: { oklch: 'oklch(0.968 0.007 247.896)', hex: '#f1f5f9' },
      200: { oklch: 'oklch(0.929 0.013 255.508)', hex: '#e2e8f0' },
      300: { oklch: 'oklch(0.869 0.022 252.894)', hex: '#cbd5e1' },
      400: { oklch: 'oklch(0.704 0.04 256.788)', hex: '#94a3b8' },
      500: { oklch: 'oklch(0.554 0.046 257.417)', hex: '#64748b' },
      600: { oklch: 'oklch(0.446 0.043 257.281)', hex: '#475569' },
      700: { oklch: 'oklch(0.372 0.044 257.287)', hex: '#334155' },
      800: { oklch: 'oklch(0.279 0.041 260.031)', hex: '#1e293b' },
      900: { oklch: 'oklch(0.208 0.042 265.755)', hex: '#0f172a' },
      950: { oklch: 'oklch(0.129 0.042 264.695)', hex: '#020617' },
    },
  },
  {
    id: 'gray',
    label: 'Gray',
    shades: {
      50: { oklch: 'oklch(0.985 0.002 247.839)', hex: '#f9fafb' },
      100: { oklch: 'oklch(0.967 0.003 264.542)', hex: '#f3f4f6' },
      200: { oklch: 'oklch(0.928 0.006 264.531)', hex: '#e5e7eb' },
      300: { oklch: 'oklch(0.872 0.01 258.338)', hex: '#d1d5db' },
      400: { oklch: 'oklch(0.707 0.022 261.325)', hex: '#9ca3af' },
      500: { oklch: 'oklch(0.551 0.027 264.364)', hex: '#6b7280' },
      600: { oklch: 'oklch(0.446 0.03 256.802)', hex: '#4b5563' },
      700: { oklch: 'oklch(0.373 0.034 259.733)', hex: '#374151' },
      800: { oklch: 'oklch(0.278 0.033 256.848)', hex: '#1f2937' },
      900: { oklch: 'oklch(0.21 0.034 264.665)', hex: '#111827' },
      950: { oklch: 'oklch(0.13 0.028 261.692)', hex: '#030712' },
    },
  },
  {
    id: 'zinc',
    label: 'Zinc',
    shades: {
      50: { oklch: 'oklch(0.985 0 0)', hex: '#fafafa' },
      100: { oklch: 'oklch(0.967 0.001 286.375)', hex: '#f4f4f5' },
      200: { oklch: 'oklch(0.92 0.004 286.32)', hex: '#e4e4e7' },
      300: { oklch: 'oklch(0.871 0.006 286.286)', hex: '#d4d4d8' },
      400: { oklch: 'oklch(0.705 0.015 286.067)', hex: '#a1a1aa' },
      500: { oklch: 'oklch(0.552 0.016 285.938)', hex: '#71717a' },
      600: { oklch: 'oklch(0.442 0.017 285.786)', hex: '#52525b' },
      700: { oklch: 'oklch(0.37 0.013 285.805)', hex: '#3f3f46' },
      800: { oklch: 'oklch(0.274 0.006 286.033)', hex: '#27272a' },
      900: { oklch: 'oklch(0.21 0.006 285.885)', hex: '#18181b' },
      950: { oklch: 'oklch(0.141 0.005 285.823)', hex: '#09090b' },
    },
  },
  {
    id: 'neutral',
    label: 'Neutral',
    shades: {
      50: { oklch: 'oklch(0.985 0 0)', hex: '#fafafa' },
      100: { oklch: 'oklch(0.97 0 0)', hex: '#f5f5f5' },
      200: { oklch: 'oklch(0.922 0 0)', hex: '#e5e5e5' },
      300: { oklch: 'oklch(0.87 0 0)', hex: '#d4d4d4' },
      400: { oklch: 'oklch(0.708 0 0)', hex: '#a3a3a3' },
      500: { oklch: 'oklch(0.556 0 0)', hex: '#737373' },
      600: { oklch: 'oklch(0.439 0 0)', hex: '#525252' },
      700: { oklch: 'oklch(0.371 0 0)', hex: '#404040' },
      800: { oklch: 'oklch(0.269 0 0)', hex: '#262626' },
      900: { oklch: 'oklch(0.205 0 0)', hex: '#171717' },
      950: { oklch: 'oklch(0.145 0 0)', hex: '#0a0a0a' },
    },
  },
  {
    id: 'stone',
    label: 'Stone',
    shades: {
      50: { oklch: 'oklch(0.985 0.001 106.423)', hex: '#fafaf9' },
      100: { oklch: 'oklch(0.97 0.001 106.424)', hex: '#f5f5f4' },
      200: { oklch: 'oklch(0.923 0.003 48.717)', hex: '#e7e5e4' },
      300: { oklch: 'oklch(0.869 0.005 56.366)', hex: '#d6d3d1' },
      400: { oklch: 'oklch(0.709 0.01 56.259)', hex: '#a8a29e' },
      500: { oklch: 'oklch(0.553 0.013 58.071)', hex: '#78716c' },
      600: { oklch: 'oklch(0.444 0.011 73.639)', hex: '#57534e' },
      700: { oklch: 'oklch(0.374 0.01 67.558)', hex: '#44403c' },
      800: { oklch: 'oklch(0.268 0.007 34.298)', hex: '#292524' },
      900: { oklch: 'oklch(0.216 0.006 56.043)', hex: '#1c1917' },
      950: { oklch: 'oklch(0.147 0.004 49.25)', hex: '#0c0a09' },
    },
  },
]

// ── Lookup helpers ─────────────────────────────────────────────────────────

/** Get a color family by ID */
export function getColorFamily(id: string): ColorFamily | undefined {
  return TAILWIND_COLORS.find((c) => c.id === id)
}

/** Get a specific shade hex value. E.g. getShadeHex('blue', 500) → '#3b82f6' */
export function getShadeHex(colorId: string, shade: number): string | undefined {
  return getColorFamily(colorId)?.shades[shade]?.hex
}

/** Get a specific shade oklch value */
export function getShadeOklch(colorId: string, shade: number): string | undefined {
  return getColorFamily(colorId)?.shades[shade]?.oklch
}

/**
 * Quick-access map: colorId → hex at shade 500
 * Used by theme presets for `primaryColor`
 */
export const PRIMARY_HEX: Record<string, string> = Object.fromEntries(
  TAILWIND_COLORS.map((c) => [c.id, c.shades[500]?.hex ?? '#000000'])
)

/**
 * Quick-access map: colorId → hex at shade 600
 * Used for hover states and dark mode primary
 */
export const PRIMARY_600_HEX: Record<string, string> = Object.fromEntries(
  TAILWIND_COLORS.map((c) => [c.id, c.shades[600]?.hex ?? '#000000'])
)

/**
 * Chromatic colors only (no grays) — for color pickers
 */
export const CHROMATIC_COLORS = TAILWIND_COLORS.filter(
  (c) => !['slate', 'gray', 'zinc', 'neutral', 'stone'].includes(c.id)
)

/**
 * Gray-scale colors only — for background theme pickers
 */
export const GRAYSCALE_COLORS = TAILWIND_COLORS.filter((c) =>
  ['slate', 'gray', 'zinc', 'neutral', 'stone'].includes(c.id)
)
