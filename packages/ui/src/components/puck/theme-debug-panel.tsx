'use client'

import { AlertTriangle, Check, Info, X } from 'lucide-react'
import React from 'react'
import { Button } from '../ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'

interface StyleOverride {
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  destructiveColor?: string
  backgroundTheme?: 'white' | 'soft' | 'dark'
  fontFamily?: string
  fontHeading?: string
  borderRadius?: string
}

interface ThemeDebugPanelProps {
  styleOverride: StyleOverride
  /** Optional: Pass computed CSS variables from DOM for verification */
  computedVars?: Record<string, string>
}

/**
 * CSS Variables that should be set by the theme system
 */
const EXPECTED_CSS_VARS = [
  { name: '--primary', source: 'primaryColor' },
  { name: '--primary-foreground', source: 'primaryColor (auto)' },
  { name: '--secondary', source: 'secondaryColor' },
  { name: '--accent', source: 'accentColor' },
  { name: '--background', source: 'backgroundTheme' },
  { name: '--foreground', source: 'backgroundTheme' },
  { name: '--card', source: 'backgroundTheme' },
  { name: '--muted', source: 'backgroundTheme' },
  { name: '--border', source: 'backgroundTheme' },
  { name: '--radius', source: 'borderRadius' },
  { name: '--font-sans', source: 'fontFamily' },
  { name: '--font-heading', source: 'fontHeading' },
] as const

/**
 * ThemeDebugPanel - Developer tool for debugging theme inheritance
 *
 * Shows:
 * 1. Current styleOverride values
 * 2. Expected CSS variables
 * 3. Actual computed CSS variables (if provided)
 * 4. Theme inheritance status
 */
export function ThemeDebugPanel({ styleOverride, computedVars }: ThemeDebugPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Check which CSS variables should be set based on styleOverride
  const expectedVars = React.useMemo(() => {
    const expected: { name: string; source: string; shouldExist: boolean }[] = []

    for (const varDef of EXPECTED_CSS_VARS) {
      let shouldExist = false

      if (varDef.source === 'primaryColor' || varDef.source === 'primaryColor (auto)') {
        shouldExist = !!styleOverride.primaryColor
      } else if (varDef.source === 'secondaryColor') {
        shouldExist = !!styleOverride.secondaryColor
      } else if (varDef.source === 'accentColor') {
        shouldExist = !!styleOverride.accentColor
      } else if (varDef.source === 'backgroundTheme') {
        shouldExist = !!styleOverride.backgroundTheme
      } else if (varDef.source === 'borderRadius') {
        shouldExist = !!styleOverride.borderRadius
      } else if (varDef.source === 'fontFamily') {
        shouldExist = !!styleOverride.fontFamily
      } else if (varDef.source === 'fontHeading') {
        shouldExist = !!styleOverride.fontHeading
      }

      expected.push({ name: varDef.name, source: varDef.source, shouldExist })
    }

    return expected
  }, [styleOverride])

  // Count active theme properties
  const activeCount = Object.values(styleOverride).filter(Boolean).length
  const totalCount = Object.keys(styleOverride).length

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant='ghost'
          size='sm'
          className='w-full justify-start text-xs text-slate-500 hover:text-slate-700 gap-2 h-7'
        >
          <Info className='w-3 h-3' />
          <span>Theme Debug</span>
          <span className='ml-auto text-[10px] font-mono'>
            {activeCount}/{8} active
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className='mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-3'>
          {/* StyleOverride Values */}
          <div>
            <h4 className='font-semibold text-slate-700 mb-1.5'>Current StyleOverride</h4>
            <div className='space-y-1 font-mono text-[10px]'>
              {Object.entries(styleOverride).map(([key, value]) => (
                <div key={key} className='flex items-center gap-2'>
                  {value ? (
                    <Check className='w-3 h-3 text-green-500' />
                  ) : (
                    <X className='w-3 h-3 text-slate-300' />
                  )}
                  <span className='text-slate-500'>{key}:</span>
                  <span className={value ? 'text-slate-900' : 'text-slate-400'}>
                    {value ? (
                      key.includes('Color') ? (
                        <span className='flex items-center gap-1'>
                          <span
                            className='inline-block w-3 h-3 rounded-sm border border-slate-200'
                            style={{ backgroundColor: value as string }}
                          />
                          {value}
                        </span>
                      ) : (
                        String(value)
                      )
                    ) : (
                      'not set'
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CSS Variables Status */}
          <div>
            <h4 className='font-semibold text-slate-700 mb-1.5'>Expected CSS Variables</h4>
            <div className='space-y-1 font-mono text-[10px]'>
              {expectedVars.map(({ name, source, shouldExist }) => (
                <div key={name} className='flex items-center gap-2'>
                  {shouldExist ? (
                    <Check className='w-3 h-3 text-green-500' />
                  ) : (
                    <span className='w-3 h-3 text-center text-slate-300'>-</span>
                  )}
                  <span className={shouldExist ? 'text-slate-900' : 'text-slate-400'}>{name}</span>
                  <span className='text-slate-400 text-[9px]'>← {source}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Computed Variables (if provided) */}
          {computedVars && Object.keys(computedVars).length > 0 && (
            <div>
              <h4 className='font-semibold text-slate-700 mb-1.5 flex items-center gap-1'>
                <span>Computed Values</span>
                <span className='text-[9px] font-normal text-slate-400'>(from DOM)</span>
              </h4>
              <div className='space-y-1 font-mono text-[10px]'>
                {Object.entries(computedVars).map(([name, value]) => (
                  <div key={name} className='flex items-center gap-2'>
                    <span className='text-slate-500'>{name}:</span>
                    <span className='text-slate-900'>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Theme Inheritance Chain */}
          <div className='pt-2 border-t border-slate-200'>
            <h4 className='font-semibold text-slate-700 mb-1.5'>Theme Hierarchy</h4>
            <div className='text-[10px] text-slate-500 space-y-0.5'>
              <div className='flex items-center gap-1'>
                <span className='font-medium text-slate-700'>1.</span>
                Global (styleOverride)
                <span className='text-slate-400'>→ CSS vars on .puck-root</span>
              </div>
              <div className='flex items-center gap-1'>
                <span className='font-medium text-slate-700'>2.</span>
                Page (data-page-theme)
                <span className='text-slate-400'>→ theme attribute</span>
              </div>
              <div className='flex items-center gap-1'>
                <span className='font-medium text-slate-700'>3.</span>
                Block (blockTheme prop)
                <span className='text-slate-400'>→ per-block override</span>
              </div>
              <div className='flex items-center gap-1'>
                <span className='font-medium text-slate-700'>4.</span>
                tailwindOverride
                <span className='text-slate-400'>→ inline className</span>
              </div>
            </div>
          </div>

          {/* Warning for missing values */}
          {activeCount === 0 && (
            <div className='flex items-start gap-2 p-2 bg-amber-50 rounded border border-amber-200 text-amber-700'>
              <AlertTriangle className='w-3.5 h-3.5 shrink-0 mt-0.5' />
              <span className='text-[10px]'>
                No theme values set. Select a theme preset or customize individual values.
              </span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/**
 * Hook to read computed CSS variables from DOM
 * Useful for verifying theme inheritance
 */
export function useComputedThemeVars(elementSelector = '.puck-root'): Record<string, string> {
  const [vars, setVars] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    const element = document.querySelector(elementSelector)
    if (!element) return

    const computed = getComputedStyle(element)
    const result: Record<string, string> = {}

    for (const varDef of EXPECTED_CSS_VARS) {
      const value = computed.getPropertyValue(varDef.name).trim()
      if (value) {
        result[varDef.name] = value
      }
    }

    setVars(result)
  }, [elementSelector])

  return vars
}
