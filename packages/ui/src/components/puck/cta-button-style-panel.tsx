import { BoxSelect, Palette, Type } from 'lucide-react'
import React from 'react'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { ColorField, FONT_PRESETS, RADIUS_PRESETS } from './global-theme-controls'

interface CTAButtonStylePanelProps {
  values: {
    primaryColor?: string
    textColor?: string
    borderRadius?: string
    fontFamily?: string
  }
  onChange: (field: string, value: string | undefined) => void
}

export function CTAButtonStylePanel({ values, onChange }: CTAButtonStylePanelProps) {
  return (
    <div className='space-y-6 p-4 bg-slate-50 rounded-lg border border-slate-200'>
      <div className='flex items-center gap-2 text-slate-600 pb-2 border-b border-slate-200'>
        <Palette className='w-4 h-4' />
        <span className='text-xs font-semibold uppercase tracking-wider'>Style Overrides</span>
      </div>

      {/* Colors Section */}
      <div className='space-y-4'>
        <ColorField
          label='Background Color'
          description='Override global primary color'
          value={values.primaryColor}
          onChange={(v) => onChange('primaryColor', v)}
        />

        <ColorField
          label='Text Color'
          description='Override button text color'
          value={values.textColor}
          onChange={(v) => onChange('textColor', v)}
        />
      </div>

      {/* Border Radius Section */}
      <div className='space-y-2'>
        <div className='flex items-center gap-2 text-slate-500'>
          <BoxSelect className='w-3 h-3' />
          <Label className='text-xs font-medium'>Border Radius</Label>
        </div>
        <Select
          value={values.borderRadius || '__global__'}
          onValueChange={(val) => onChange('borderRadius', val === '__global__' ? undefined : val)}
        >
          <SelectTrigger className='h-8 text-xs bg-white w-full'>
            <SelectValue placeholder='Use Global' />
          </SelectTrigger>
          <SelectContent position='popper' sideOffset={5} className='min-w-60'>
            <SelectGroup>
              <SelectLabel>Radius Presets</SelectLabel>
              <SelectItem value='__global__' className='text-xs'>
                Use Global
              </SelectItem>
              {RADIUS_PRESETS.filter((p) => p.value !== 'custom').map((preset) => (
                <SelectItem key={preset.value} value={preset.value} className='text-xs'>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {values.borderRadius && (
          <button
            type='button'
            onClick={() => onChange('borderRadius', undefined)}
            className='text-[10px] text-slate-400 hover:text-red-500 transition-colors'
          >
            Reset to Global
          </button>
        )}
      </div>

      {/* Font Family Section */}
      <div className='space-y-2'>
        <div className='flex items-center gap-2 text-slate-500'>
          <Type className='w-3 h-3' />
          <Label className='text-xs font-medium'>Font Family</Label>
        </div>
        <Select
          value={values.fontFamily || '__global__'}
          onValueChange={(val) => onChange('fontFamily', val === '__global__' ? undefined : val)}
        >
          <SelectTrigger className='h-8 text-xs bg-white w-full max-w-full'>
            <SelectValue placeholder='Use Global' />
          </SelectTrigger>
          <SelectContent position='popper' sideOffset={5} className='min-w-70 max-h-80'>
            <SelectGroup>
              <SelectLabel>Default</SelectLabel>
              <SelectItem value='__global__' className='text-xs'>
                Use Global
              </SelectItem>
            </SelectGroup>
            {['Sans-Serif', 'System', 'Serif', 'Display', 'Monospace'].map((category) => {
              const fontsInCategory = FONT_PRESETS.filter(
                (p) => p.category === category && p.value !== 'custom'
              )
              if (fontsInCategory.length === 0) return null
              return (
                <SelectGroup key={category}>
                  <SelectLabel>{category}</SelectLabel>
                  {fontsInCategory.slice(0, 5).map((preset) => (
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
        {values.fontFamily && (
          <button
            type='button'
            onClick={() => onChange('fontFamily', undefined)}
            className='text-[10px] text-slate-400 hover:text-red-500 transition-colors'
          >
            Reset to Global
          </button>
        )}
      </div>
    </div>
  )
}
