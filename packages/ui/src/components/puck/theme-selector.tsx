'use client'

import { motion } from 'motion/react'
import * as React from 'react'
import { THEME_OPTIONS } from '../../lib/theme-options'
import { cn } from '../../lib/utils'
import type { DesignThemeId } from '../design-theme-provider'

interface ThemeSelectorProps {
  value: DesignThemeId
  onChange: (value: DesignThemeId) => void
}

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <div className='grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1'>
      {THEME_OPTIONS.map((theme) => {
        const isActive = value === theme.id
        return (
          <button
            type='button'
            key={theme.id}
            onClick={() => onChange(theme.id)}
            className={cn(
              'group relative flex flex-col gap-2 rounded-lg border p-2 text-left transition-all hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-transparent',
              !isActive && 'border-border bg-transparent'
            )}
          >
            {isActive && (
              <motion.div
                layoutId='theme-active-bg'
                className='absolute inset-0 rounded-lg bg-primary/5 border border-primary/20'
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <div className='flex w-full items-center justify-between z-10'>
              <div
                className='h-4 w-4 rounded-full border border-border/20 shadow-sm'
                style={{ backgroundColor: theme.color }}
              />
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className='absolute right-2 top-2 h-2 w-2 rounded-full bg-primary'
                />
              )}
            </div>
            <span
              className={cn(
                'text-[11px] font-medium leading-tight line-clamp-2 w-full z-10 transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
              )}
            >
              {theme.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
