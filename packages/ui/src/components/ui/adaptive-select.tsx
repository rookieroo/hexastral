'use client'

import { Button } from '@zhop/ui/components/button'
import { Popover, PopoverContent, PopoverTrigger } from '@zhop/ui/components/popover'
import { ChevronDown } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { useIsMobile } from './use-mobile'

export interface SelectOption {
  value: string
  label: string
}

interface AdaptiveSelectProps {
  options: SelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function AdaptiveSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select an option...',
  className,
  disabled = false,
}: AdaptiveSelectProps) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  const selectedOption = options.find((option) => option.value === value)

  // 移动端使用原生 select
  if (isMobile) {
    return (
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      >
        <option value=''>{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  // 桌面端使用自定义下拉框
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className={cn('w-full justify-between h-10 px-3', className)}
          disabled={disabled}
        >
          <span className='truncate'>{selectedOption ? selectedOption.label : placeholder}</span>
          <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-1' align='start'>
        <div className='max-h-64 overflow-auto'>
          {options.map((option) => (
            <button
              type='button'
              key={option.value}
              className={cn(
                'w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors',
                value === option.value && 'bg-slate-100 dark:bg-slate-700 font-medium'
              )}
              onClick={() => {
                onValueChange(option.value)
                setOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
