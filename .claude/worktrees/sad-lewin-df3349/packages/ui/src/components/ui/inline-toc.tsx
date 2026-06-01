'use client'

import { ChevronDown, List } from 'lucide-react'
import { ComponentProps, useState } from 'react'
import { cn } from '@/lib/utils'

export interface TOCItem {
  title: string
  url: string
  depth: number
}

export interface InlineTOCProps extends ComponentProps<'div'> {
  items: TOCItem[]
  defaultOpen?: boolean
}

export function InlineTOC({ items, defaultOpen = false, className, ...props }: InlineTOCProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (!items || items.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'not-prose rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden',
        className
      )}
      {...props}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='group inline-flex w-full items-center justify-between px-4 py-3 font-medium text-sm hover:bg-muted/50 transition-all duration-200'
      >
        <div className='flex items-center gap-2'>
          <List className='size-4 text-muted-foreground' />
          <span>Table of Contents</span>
        </div>
        <ChevronDown
          className={cn(
            'size-4 transition-transform duration-200 text-muted-foreground',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className='border-t'>
          <div className='px-4 py-3'>
            <div className='space-y-1 border-l border-border pl-4'>
              {items.map((item, index) => (
                <a
                  key={item.url}
                  href={item.url}
                  className={cn(
                    'block py-1.5 text-sm transition-colors hover:text-foreground',
                    item.depth === 1 && 'font-medium text-foreground/90',
                    item.depth === 2 && 'text-muted-foreground pl-2',
                    item.depth >= 3 && 'text-muted-foreground/80 pl-4'
                  )}
                >
                  <span className='truncate'>{item.title}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
