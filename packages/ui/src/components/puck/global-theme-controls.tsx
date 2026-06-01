import {
  AlertTriangle,
  BoxSelect,
  Check,
  Download,
  Palette,
  RotateCcw,
  Sparkles,
  Type,
  Upload,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import React from 'react'
import { HexColorPicker } from 'react-colorful'
import {
  type ContrastLevel,
  getBestForeground,
  getContrastLevel,
  getContrastRatio,
} from '../../lib/contrast'
import { TAILWIND_COLORS } from '../../lib/tailwind-palette'
import {
  COLOR_SWATCHES,
  getThemePreset,
  THEME_PRESETS,
  type ThemePreset,
} from '../../lib/theme-options'
import { cn } from '../../lib/utils'
import type { DesignThemeId } from '../design-theme-provider'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { ThemeDebugPanel } from './theme-debug-panel'

interface StyleOverride {
  // Core Brand Colors
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  destructiveColor?: string

  // Background Theme
  backgroundTheme?: 'white' | 'soft' | 'dark'

  // Surface Colors (overrides backgroundTheme when set)
  cardColor?: string
  mutedColor?: string
  borderColor?: string

  // Sidebar Colors
  sidebarColor?: string
  sidebarAccentColor?: string

  // Typography
  fontFamily?: string
  fontHeading?: string

  // Shape
  borderRadius?: string
}

interface GlobalThemeControlsProps {
  styleOverride: StyleOverride
  onChange: (key: string, value: string) => void
  /** Called when user selects a theme preset to apply all values at once */
  onApplyPreset?: (preset: StyleOverride) => void
}

const FONT_PRESETS = [
  // Sans-Serif Fonts
  { label: 'Inter (Default)', value: 'Inter, sans-serif', category: 'Sans-Serif' },
  { label: 'Inter Tight', value: "'Inter Tight', sans-serif", category: 'Sans-Serif' },
  { label: 'Manrope', value: 'Manrope, sans-serif', category: 'Sans-Serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif', category: 'Sans-Serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif', category: 'Sans-Serif' },
  { label: 'Open Sans', value: "'Open Sans', sans-serif", category: 'Sans-Serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif', category: 'Sans-Serif' },
  { label: 'Lato', value: 'Lato, sans-serif', category: 'Sans-Serif' },
  { label: 'Nunito', value: 'Nunito, sans-serif', category: 'Sans-Serif' },
  { label: 'Work Sans', value: "'Work Sans', sans-serif", category: 'Sans-Serif' },
  { label: 'DM Sans', value: "'DM Sans', sans-serif", category: 'Sans-Serif' },
  { label: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif", category: 'Sans-Serif' },
  { label: 'Outfit', value: 'Outfit, sans-serif', category: 'Sans-Serif' },
  { label: 'Space Grotesk', value: "'Space Grotesk', sans-serif", category: 'Sans-Serif' },

  // System Fonts (Safe for commercial use)
  { label: 'System UI', value: 'system-ui, -apple-system, sans-serif', category: 'System' },
  { label: 'Arial', value: 'Arial, sans-serif', category: 'System' },
  { label: 'Verdana', value: 'Verdana, sans-serif', category: 'System' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif', category: 'System' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif", category: 'System' },
  { label: 'Georgia', value: 'Georgia, serif', category: 'System' },
  { label: 'Courier New', value: "'Courier New', monospace", category: 'System' },

  // Serif Fonts
  { label: 'Playfair Display', value: "'Playfair Display', serif", category: 'Serif' },
  { label: 'Merriweather', value: 'Merriweather, serif', category: 'Serif' },
  { label: 'Lora', value: 'Lora, serif', category: 'Serif' },
  { label: 'Libre Baskerville', value: "'Libre Baskerville', serif", category: 'Serif' },
  { label: 'Crimson Text', value: "'Crimson Text', serif", category: 'Serif' },
  { label: 'EB Garamond', value: "'EB Garamond', serif", category: 'Serif' },
  { label: 'Cormorant', value: 'Cormorant, serif', category: 'Serif' },

  // Display & Decorative
  { label: 'Archivo', value: 'Archivo, sans-serif', category: 'Display' },
  { label: 'Oswald', value: 'Oswald, sans-serif', category: 'Display' },
  { label: 'Bebas Neue', value: "'Bebas Neue', sans-serif", category: 'Display' },
  { label: 'Anton', value: 'Anton, sans-serif', category: 'Display' },
  { label: 'Righteous', value: 'Righteous, sans-serif', category: 'Display' },

  // Monospace Fonts (All OFL licensed)
  { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace", category: 'Monospace' },
  { label: 'Fira Code', value: "'Fira Code', monospace", category: 'Monospace' },
  { label: 'Source Code Pro', value: "'Source Code Pro', monospace", category: 'Monospace' },
  { label: 'IBM Plex Mono', value: "'IBM Plex Mono', monospace", category: 'Monospace' },
  { label: 'Inconsolata', value: 'Inconsolata, monospace', category: 'Monospace' },

  // Custom
  { label: 'Custom...', value: 'custom', category: 'Custom' },
]

const RADIUS_PRESETS = [
  { label: 'None (0px)', value: '0px' },
  { label: 'Small (0.3rem)', value: '0.3rem' },
  { label: 'Medium (0.5rem)', value: '0.5rem' },
  { label: 'Large (0.75rem)', value: '0.75rem' },
  { label: 'Extra Large (1rem)', value: '1rem' },
  { label: 'Full (Pill)', value: '9999px' },
  { label: 'Custom...', value: 'custom' },
]

// Reusable ColorField component with Tailwind color swatches
export function ColorField({
  label,
  description,
  value,
  onChange,
  contrastAgainst,
}: {
  label: string
  description?: string
  value?: string
  onChange: (val: string) => void
  /** When set, shows a WCAG contrast ratio badge against this background color */
  contrastAgainst?: string
}) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Calculate contrast when both colors are available
  const contrastInfo = React.useMemo(() => {
    if (!contrastAgainst || !value) return null
    // Only calculate for valid hex colors
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return null
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(contrastAgainst)) return null
    const ratio = getContrastRatio(value, contrastAgainst)
    const level = getContrastLevel(ratio)
    return { ratio, level }
  }, [value, contrastAgainst])

  return (
    <div className='grid gap-2'>
      <div className='flex justify-between items-center'>
        <Label className='text-xs font-medium'>{label}</Label>
        <div className='flex items-center gap-1.5'>
          {contrastInfo && <ContrastBadge ratio={contrastInfo.ratio} level={contrastInfo.level} />}
          {value && (
            <button
              type='button'
              onClick={() => onChange('')}
              className='text-[10px] text-slate-400 hover:text-red-500 transition-colors'
            >
              Reset
            </button>
          )}
        </div>
      </div>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            className='w-full justify-start text-left font-mono text-xs h-9 px-2 relative'
          >
            <div
              className='w-5 h-5 rounded border border-slate-200 mr-2 shadow-sm'
              style={{ backgroundColor: value || 'transparent' }}
            />
            <span className='flex-1 truncate'>{value || 'Inherit'}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className='w-[224px] p-3 bg-white dark:bg-slate-950 border border-slate-200 shadow-lg'
          align='start'
          sideOffset={5}
        >
          <div className='[&_.react-colorful]:!w-full'>
            <HexColorPicker color={value || '#000000'} onChange={onChange} />
          </div>

          {/* Contrast preview when contrastAgainst is provided */}
          {contrastAgainst && value && contrastInfo && (
            <div
              className='mt-2 rounded-md p-2 border border-slate-200 text-center'
              style={{ backgroundColor: contrastAgainst }}
            >
              <span className='text-xs font-medium' style={{ color: value }}>
                Aa — {contrastInfo.ratio.toFixed(1)}:1
              </span>
            </div>
          )}

          {/* Tailwind Color Swatches — stacked circles */}
          <div className='mt-2.5 flex items-center w-full'>
            {COLOR_SWATCHES.map((swatch, i) => (
              <button
                type='button'
                key={swatch.family}
                title={`${swatch.label} · ${swatch.hex}`}
                className={cn(
                  'w-5 h-5 rounded-full border-2 border-white dark:border-slate-950 transition-all hover:scale-125 hover:z-20 shrink-0',
                  i > 0 && '-ml-1',
                  value?.toLowerCase() === swatch.hex.toLowerCase()
                    ? 'ring-2 ring-slate-900 scale-125 z-20'
                    : 'hover:ring-1 hover:ring-slate-400'
                )}
                style={{
                  backgroundColor: swatch.hex,
                  zIndex: value?.toLowerCase() === swatch.hex.toLowerCase() ? 20 : undefined,
                }}
                onClick={() => onChange(swatch.hex)}
              />
            ))}
          </div>

          {/* Neutral row — stacked circles */}
          <div className='mt-1.5 flex items-center w-full'>
            {[
              '#fafafa',
              '#e5e5e5',
              '#a3a3a3',
              '#737373',
              '#525252',
              '#404040',
              '#262626',
              '#171717',
              '#0a0a0a',
            ].map((hex, i) => (
              <button
                type='button'
                key={hex}
                title={hex}
                className={cn(
                  'w-5 h-5 rounded-full border-2 border-white dark:border-slate-950 transition-all hover:scale-125 hover:z-20 shrink-0',
                  i > 0 && '-ml-1',
                  value?.toLowerCase() === hex.toLowerCase()
                    ? 'ring-2 ring-slate-900 scale-125 z-20'
                    : 'hover:ring-1 hover:ring-slate-400'
                )}
                style={{
                  backgroundColor: hex,
                  zIndex: value?.toLowerCase() === hex.toLowerCase() ? 20 : undefined,
                }}
                onClick={() => onChange(hex)}
              />
            ))}
          </div>

          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className='mt-2.5 h-7 text-xs font-mono w-full'
            placeholder='#000000'
            maxLength={9}
          />
        </PopoverContent>
      </Popover>
      {description && <p className='text-[10px] text-slate-400'>{description}</p>}
    </div>
  )
}

/**
 * WCAG Contrast Badge — shows ratio and color-coded accessibility level.
 * - AAA (≥7:1): Green
 * - AA (≥4.5:1): Blue
 * - AA-large (≥3:1): Yellow with warning
 * - Fail (<3:1): Red with alert icon
 */
function ContrastBadge({ ratio, level }: { ratio: number; level: ContrastLevel }) {
  const config = {
    AAA: { bg: 'bg-emerald-100 text-emerald-700', label: 'AAA' },
    AA: { bg: 'bg-blue-100 text-blue-700', label: 'AA' },
    'AA-large': { bg: 'bg-amber-100 text-amber-700', label: 'AA₁₈' },
    Fail: { bg: 'bg-red-100 text-red-700', label: 'Fail' },
  }[level]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-semibold',
        config.bg
      )}
    >
      {level === 'Fail' && <AlertTriangle className='w-2.5 h-2.5' />}
      {ratio.toFixed(1)} {config.label}
    </span>
  )
}

// Export presets for reuse in other components
export { FONT_PRESETS, RADIUS_PRESETS }

/**
 * Sparkle particles for theme selection celebration
 */
function SelectSparkles({ color }: { color: string }) {
  return (
    <>
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * 360
        const rad = (angle * Math.PI) / 180
        return (
          <motion.div
            key={i}
            className='absolute w-1 h-1 rounded-full'
            style={{ backgroundColor: color, top: '50%', left: '50%' }}
            initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
            animate={{
              scale: [0, 1.2, 0],
              x: Math.cos(rad) * 18,
              y: Math.sin(rad) * 18,
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 0.5, delay: i * 0.03, ease: 'easeOut' }}
          />
        )
      })}
    </>
  )
}

/**
 * Skeleton Theme Circle — multi-band color segments showcase theme palette.
 * Checked state uses ring highlight + corner badge, keeping colors fully visible.
 */
function ThemePreviewCard({
  theme,
  isActive,
  onClick,
}: {
  theme: ThemePreset
  isActive: boolean
  onClick: () => void
}) {
  const { preset } = theme
  const [justSelected, setJustSelected] = React.useState(false)

  // Build 5-segment palette from color family shades or fallback to preset colors
  const colorFamily = theme.colorFamily
    ? TAILWIND_COLORS.find((f) => f.id === theme.colorFamily)
    : null

  const segments = colorFamily
    ? ([
        colorFamily.shades[200]?.hex,
        colorFamily.shades[400]?.hex,
        colorFamily.shades[500]?.hex,
        colorFamily.shades[600]?.hex,
        colorFamily.shades[800]?.hex,
      ].filter(Boolean) as string[])
    : ([preset.primaryColor, preset.accentColor, preset.secondaryColor].filter(Boolean) as string[])

  // Build conic gradient for even segments
  const segmentAngle = 360 / segments.length
  const conicStops = segments
    .map((color, i) => `${color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`)
    .join(', ')

  const handleClick = () => {
    if (!isActive) {
      setJustSelected(true)
      setTimeout(() => setJustSelected(false), 600)
    }
    onClick()
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <motion.button
            type='button'
            onClick={handleClick}
            className={cn(
              'relative rounded-full w-10 h-10 focus:outline-none transition-shadow',
              isActive
                ? 'ring-2 ring-slate-900 ring-offset-2 shadow-md'
                : 'shadow-sm hover:shadow-md'
            )}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {/* Conic gradient segments */}
            <div
              className='absolute inset-0 rounded-full'
              style={{ background: `conic-gradient(from 135deg, ${conicStops})` }}
            />

            {/* Inner circle mask for donut effect — shows brand in ring form */}
            <div className='absolute inset-[6px] rounded-full bg-white/90 dark:bg-slate-950/90' />

            {/* Center dot with primary color */}
            <div
              className='absolute inset-[10px] rounded-full'
              style={{ backgroundColor: preset.primaryColor }}
            />

            {/* Sparkle burst on selection */}
            <AnimatePresence>
              {justSelected && <SelectSparkles color={preset.primaryColor} />}
            </AnimatePresence>

            {/* Minimal check badge — bottom-right corner */}
            <AnimatePresence mode='wait'>
              {isActive && (
                <motion.div
                  layoutId='theme-check'
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className='absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center shadow-sm border-2 border-white'
                >
                  <Check className='w-2.5 h-2.5 text-white' strokeWidth={3} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side='bottom' className='max-w-48'>
          <p className='text-xs font-medium'>{theme.label}</p>
          <p className='text-[10px] text-slate-500'>{theme.description}</p>
          <div className='mt-1.5 flex items-center gap-1'>
            {segments.map((hex, i) => (
              <div
                key={i}
                className='w-3 h-3 rounded-full border border-white/50'
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Detect which theme preset matches the current styleOverride
 * Returns the theme ID if there's a close match, undefined otherwise
 */
function detectMatchingTheme(styleOverride: StyleOverride): DesignThemeId | undefined {
  // Find a theme where primary color matches
  const match = THEME_PRESETS.find(
    (theme) =>
      styleOverride.primaryColor === theme.preset.primaryColor &&
      styleOverride.backgroundTheme === theme.preset.backgroundTheme
  )
  return match?.id
}

export function GlobalThemeControls({
  styleOverride,
  onChange,
  onApplyPreset,
}: GlobalThemeControlsProps) {
  // Detect active theme based on current styleOverride values
  const activeThemeId = React.useMemo(() => detectMatchingTheme(styleOverride), [styleOverride])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const currentFont = styleOverride.fontFamily || 'Inter, sans-serif'
  const [fontMode, setFontMode] = React.useState(() => {
    return FONT_PRESETS.some((p) => p.value === currentFont) ? 'preset' : 'custom'
  })

  const currentRadius = styleOverride.borderRadius || '0.5rem'
  const [radiusMode, setRadiusMode] = React.useState(() => {
    return RADIUS_PRESETS.some((p) => p.value === currentRadius) ? 'preset' : 'custom'
  })

  // Compute effective background color for contrast checking
  // Brand colors that appear as text/buttons on the page need contrast against
  // the background; surface colors need contrast against their foreground text.
  const effectiveBgColor = React.useMemo(() => {
    const bgThemeMap: Record<string, string> = {
      white: '#ffffff',
      soft: '#f8fafc',
      dark: '#0f172a',
    }
    return bgThemeMap[styleOverride.backgroundTheme ?? 'white'] ?? '#ffffff'
  }, [styleOverride.backgroundTheme])

  // Sync state with props (e.g. for Undo/Redo)
  React.useEffect(() => {
    if (FONT_PRESETS.some((p) => p.value === currentFont)) {
      setFontMode('preset')
    } else {
      setFontMode('custom')
    }
  }, [currentFont])

  React.useEffect(() => {
    if (RADIUS_PRESETS.some((p) => p.value === currentRadius)) {
      setRadiusMode('preset')
    } else {
      setRadiusMode('custom')
    }
  }, [currentRadius])

  // Handle theme preset selection
  const handleThemeSelect = (themeId: DesignThemeId) => {
    const preset = getThemePreset(themeId)
    if (preset && onApplyPreset) {
      onApplyPreset(preset.preset)
    }
  }

  // Export theme as JSON
  const handleExportTheme = () => {
    const themeData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      styleOverride,
    }
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `theme-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Import theme from JSON
  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !onApplyPreset) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (data.styleOverride) {
          onApplyPreset(data.styleOverride)
        }
      } catch (err) {
        console.error('Failed to parse theme file:', err)
      }
    }
    reader.readAsText(file)
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className='space-y-6'>
      {/* Theme Presets Section */}
      <div className='space-y-4'>
        <div className='flex items-center justify-between pb-1 border-b border-slate-100'>
          <div className='flex items-center gap-2 text-slate-500'>
            <Sparkles className='w-4 h-4' />
            <span className='text-xs font-semibold uppercase tracking-wider'>Theme Presets</span>
          </div>
          {/* Import/Export buttons */}
          <div className='flex items-center gap-1'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6'
                    onClick={handleExportTheme}
                  >
                    <Download className='w-3.5 h-3.5 text-slate-400' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export Theme</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6'
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className='w-3.5 h-3.5 text-slate-400' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Import Theme</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6'
                    onClick={() => {
                      if (onApplyPreset) {
                        onApplyPreset({})
                      }
                    }}
                  >
                    <RotateCcw className='w-3.5 h-3.5 text-slate-400' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset All Theme Values</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <input
              ref={fileInputRef}
              type='file'
              accept='.json'
              className='hidden'
              onChange={handleImportTheme}
            />
          </div>
        </div>

        {/* Core Styles */}
        <div className='space-y-2'>
          <span className='text-[10px] font-medium text-slate-400 uppercase tracking-wider'>
            Core
          </span>
          <div className='flex flex-wrap gap-2'>
            {THEME_PRESETS.filter((t) => ['default', 'minimal', 'bold'].includes(t.id)).map(
              (theme) => (
                <ThemePreviewCard
                  key={theme.id}
                  theme={theme}
                  isActive={activeThemeId === theme.id}
                  onClick={() => handleThemeSelect(theme.id)}
                />
              )
            )}
          </div>
        </div>

        {/* Color Themes */}
        <div className='space-y-2'>
          <span className='text-[10px] font-medium text-slate-400 uppercase tracking-wider'>
            Colors
          </span>
          <div className='flex flex-wrap gap-2'>
            {THEME_PRESETS.filter(
              (t) =>
                ![
                  'default',
                  'minimal',
                  'bold',
                  'red',
                  'slate',
                  'gray',
                  'zinc',
                  'neutral',
                  'stone',
                ].includes(t.id)
            ).map((theme) => (
              <ThemePreviewCard
                key={theme.id}
                theme={theme}
                isActive={activeThemeId === theme.id}
                onClick={() => handleThemeSelect(theme.id)}
              />
            ))}
          </div>
        </div>

        {/* Neutral Themes */}
        <div className='space-y-2'>
          <span className='text-[10px] font-medium text-slate-400 uppercase tracking-wider'>
            Neutrals
          </span>
          <div className='flex flex-wrap gap-2'>
            {THEME_PRESETS.filter((t) => ['slate', 'gray', 'stone'].includes(t.id)).map((theme) => (
              <ThemePreviewCard
                key={theme.id}
                theme={theme}
                isActive={activeThemeId === theme.id}
                onClick={() => handleThemeSelect(theme.id)}
              />
            ))}
          </div>
        </div>

        <p className='text-[10px] text-slate-400'>
          Each preset uses color theory harmonies. Hover for full palette.
        </p>
      </div>

      {/* Background Theme Section */}
      <div className='space-y-4'>
        <div className='flex items-center gap-2 text-slate-500 pb-1 border-b border-slate-100'>
          <Palette className='w-4 h-4' />
          <span className='text-xs font-semibold uppercase tracking-wider'>Base Theme</span>
        </div>

        <div className='grid gap-2'>
          <Label className='text-xs font-medium'>Background Style</Label>
          <Select
            value={styleOverride.backgroundTheme || 'white'}
            onValueChange={(val) => onChange('backgroundTheme', val)}
          >
            <SelectTrigger className='h-8 text-xs bg-white w-full'>
              <SelectValue placeholder='Select Background' />
            </SelectTrigger>
            <SelectContent position='popper' sideOffset={5}>
              <SelectGroup>
                <SelectLabel>Background Presets</SelectLabel>
                <SelectItem value='white' className='text-xs'>
                  Clean White
                </SelectItem>
                <SelectItem value='soft' className='text-xs'>
                  Soft Gray
                </SelectItem>
                <SelectItem value='dark' className='text-xs'>
                  Dark Mode
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <p className='text-[10px] text-slate-400'>Base background tone for your site.</p>
        </div>
      </div>

      {/* Colors Section */}
      <div className='space-y-4'>
        <div className='flex items-center gap-2 text-slate-500 pb-1 border-b border-slate-100'>
          <Palette className='w-4 h-4' />
          <span className='text-xs font-semibold uppercase tracking-wider'>Brand Colors</span>
        </div>

        <ColorField
          label='Primary Brand Color'
          description='Main brand color (Buttons, Links, CTAs)'
          value={styleOverride.primaryColor}
          onChange={(v) => onChange('primaryColor', v)}
          contrastAgainst={effectiveBgColor}
        />

        <ColorField
          label='Accent Color'
          description='Highlights and interactive elements'
          value={styleOverride.accentColor}
          onChange={(v) => onChange('accentColor', v)}
          contrastAgainst={effectiveBgColor}
        />

        <ColorField
          label='Secondary Color'
          description='Subtle accents and backgrounds'
          value={styleOverride.secondaryColor}
          onChange={(v) => onChange('secondaryColor', v)}
          contrastAgainst={effectiveBgColor}
        />

        <ColorField
          label='Action Color (Destructive)'
          description='Alerts, errors, and urgent actions'
          value={styleOverride.destructiveColor}
          onChange={(v) => onChange('destructiveColor', v)}
          contrastAgainst={effectiveBgColor}
        />
      </div>

      {/* Surface Colors Section */}
      <div className='space-y-4'>
        <div className='flex items-center gap-2 text-slate-500 pb-1 border-b border-slate-100'>
          <BoxSelect className='w-4 h-4' />
          <span className='text-xs font-semibold uppercase tracking-wider'>Surface Colors</span>
        </div>
        <p className='text-[10px] text-slate-400'>
          Fine-tune surface colors. These override the Background Theme values above.
        </p>

        <ColorField
          label='Card Background'
          description='Cards, popovers, and dialogs'
          value={styleOverride.cardColor}
          onChange={(v) => onChange('cardColor', v)}
          contrastAgainst={effectiveBgColor === '#0f172a' ? '#f8fafc' : '#0f172a'}
        />

        <ColorField
          label='Muted Background'
          description='Subtle backgrounds, disabled states'
          value={styleOverride.mutedColor}
          onChange={(v) => onChange('mutedColor', v)}
          contrastAgainst={effectiveBgColor === '#0f172a' ? '#94a3b8' : '#64748b'}
        />

        <ColorField
          label='Border Color'
          description='Borders, dividers, and input outlines'
          value={styleOverride.borderColor}
          onChange={(v) => onChange('borderColor', v)}
        />

        <ColorField
          label='Sidebar Background'
          description='Navigation sidebar background'
          value={styleOverride.sidebarColor}
          onChange={(v) => onChange('sidebarColor', v)}
        />

        <ColorField
          label='Sidebar Accent'
          description='Active item highlight in sidebar'
          value={styleOverride.sidebarAccentColor}
          onChange={(v) => onChange('sidebarAccentColor', v)}
        />
      </div>

      {/* Typography Section */}
      <div className='space-y-4'>
        <div className='flex items-center gap-2 text-slate-500 pb-1 border-b border-slate-100'>
          <Type className='w-4 h-4' />
          <span className='text-xs font-semibold uppercase tracking-wider'>Typography</span>
        </div>

        <div className='grid gap-2'>
          <Label className='text-xs font-medium'>Body Font</Label>
          <Select
            value={FONT_PRESETS.some((p) => p.value === currentFont) ? currentFont : 'custom'}
            onValueChange={(val) => {
              if (val === 'custom') {
                setFontMode('custom')
              } else {
                setFontMode('preset')
                onChange('fontFamily', val)
              }
            }}
          >
            <SelectTrigger className='h-8 text-xs bg-white w-full max-w-full'>
              <SelectValue placeholder='Select Font' />
            </SelectTrigger>
            <SelectContent position='popper' sideOffset={5} className='max-h-100'>
              {['Sans-Serif', 'System', 'Serif', 'Display', 'Monospace', 'Custom'].map(
                (category) => {
                  const fontsInCategory = FONT_PRESETS.filter((p) => p.category === category)
                  if (fontsInCategory.length === 0) return null
                  return (
                    <SelectGroup key={category}>
                      <SelectLabel>{category}</SelectLabel>
                      {fontsInCategory.map((preset) => (
                        <SelectItem
                          key={preset.value}
                          value={preset.value}
                          className='text-xs'
                          style={{
                            fontFamily: preset.value !== 'custom' ? preset.value : undefined,
                          }}
                        >
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )
                }
              )}
            </SelectContent>
          </Select>

          {(fontMode === 'custom' || !FONT_PRESETS.some((p) => p.value === currentFont)) && (
            <Input
              value={styleOverride.fontFamily || ''}
              onChange={(e) => onChange('fontFamily', e.target.value)}
              placeholder='Inter, sans-serif'
              className='h-8 text-xs bg-white animate-in fade-in slide-in-from-top-1'
            />
          )}

          <p className='text-[10px] text-slate-400'>
            {fontMode === 'custom'
              ? 'Enter a Google Font name or system font stack.'
              : 'Main text and paragraph font.'}
          </p>
        </div>

        <div className='grid gap-2'>
          <Label className='text-xs font-medium'>Heading Font (Optional)</Label>
          <Select
            value={styleOverride.fontHeading || 'inherit'}
            onValueChange={(val) => onChange('fontHeading', val === 'inherit' ? '' : val)}
          >
            <SelectTrigger className='h-8 text-xs bg-white w-full max-w-full'>
              <SelectValue placeholder='Inherit from Body' />
            </SelectTrigger>
            <SelectContent position='popper' sideOffset={5} className='max-h-100'>
              <SelectGroup>
                <SelectLabel>Default</SelectLabel>
                <SelectItem value='inherit' className='text-xs'>
                  Inherit from Body Font
                </SelectItem>
              </SelectGroup>
              {['Sans-Serif', 'Serif', 'Display', 'System'].map((category) => {
                const fontsInCategory = FONT_PRESETS.filter(
                  (p) => p.category === category && p.value !== 'custom'
                )
                if (fontsInCategory.length === 0) return null
                return (
                  <SelectGroup key={category}>
                    <SelectLabel>{category}</SelectLabel>
                    {fontsInCategory.map((preset) => (
                      <SelectItem
                        key={preset.value}
                        value={preset.value}
                        className='text-xs'
                        style={{ fontFamily: preset.value }}
                      >
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )
              })}
            </SelectContent>
          </Select>
          <p className='text-[10px] text-slate-400'>
            Font for headings (h1, h2, h3, etc). Leave as inherit to use body font.
          </p>
        </div>
      </div>

      {/* Shape Section */}
      <div className='space-y-4'>
        <div className='flex items-center gap-2 text-slate-500 pb-1 border-b border-slate-100'>
          <BoxSelect className='w-4 h-4' />
          <span className='text-xs font-semibold uppercase tracking-wider'>Shape</span>
        </div>

        <div className='grid gap-2'>
          <Label className='text-xs font-medium'>Global Radius</Label>
          <Select
            value={RADIUS_PRESETS.some((p) => p.value === currentRadius) ? currentRadius : 'custom'}
            onValueChange={(val) => {
              if (val === 'custom') {
                setRadiusMode('custom')
              } else {
                setRadiusMode('preset')
                onChange('borderRadius', val)
              }
            }}
          >
            <SelectTrigger className='h-8 text-xs bg-white w-full max-w-full'>
              <SelectValue placeholder='Select Radius' />
            </SelectTrigger>
            <SelectContent position='popper' sideOffset={5}>
              <SelectGroup>
                <SelectLabel>Radius Presets</SelectLabel>
                {RADIUS_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value} className='text-xs'>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {(radiusMode === 'custom' || !RADIUS_PRESETS.some((p) => p.value === currentRadius)) && (
            <Input
              value={styleOverride.borderRadius || ''}
              onChange={(e) => onChange('borderRadius', e.target.value)}
              placeholder='0.5rem'
              className='h-8 text-xs bg-white animate-in fade-in slide-in-from-top-1'
            />
          )}
          <p className='text-[10px] text-slate-400'>
            Base border radius for cards, buttons, and inputs.
          </p>
        </div>
      </div>

      {/* Debug Panel - Development Tool */}
      {process.env.NODE_ENV === 'development' && (
        <div className='pt-4 border-t border-slate-100'>
          <ThemeDebugPanel styleOverride={styleOverride} />
        </div>
      )}
    </div>
  )
}
