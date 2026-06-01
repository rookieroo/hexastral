'use client'

import { Image as ImageIcon, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog'
import { MediaPicker, type MediaPickerProps } from './media-picker'

/**
 * Custom Puck field for media selection with preview
 */
export interface MediaFieldProps extends Omit<MediaPickerProps, 'value' | 'onChange' | 'onClose'> {
  value?: string
  onChange: (value: string) => void
  id?: string
  /**
   * Preview aspect ratio (e.g., "16/9", "1/1", "4/3")
   */
  previewAspect?: string
  /**
   * Show preview image
   */
  showPreview?: boolean
}

export function MediaField({
  value,
  onChange,
  id,
  previewAspect = '16/9',
  showPreview = true,
  ...mediaPickerProps
}: MediaFieldProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (url: string) => {
    onChange(url)
    setOpen(false)
  }

  const handleClear = () => {
    onChange('')
  }

  return (
    <div className='space-y-2'>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type='button'
            variant='outline'
            className='w-full justify-start text-left font-normal'
          >
            <ImageIcon className='mr-2 h-4 w-4' />
            {value ? 'Change media' : 'Select media'}
          </Button>
        </DialogTrigger>
        <DialogContent className='max-w-5xl p-0'>
          <MediaPicker
            value={value}
            onChange={handleSelect}
            onClose={() => setOpen(false)}
            {...mediaPickerProps}
          />
        </DialogContent>
      </Dialog>

      {showPreview && value && (
        <div className='relative rounded-lg border overflow-hidden bg-muted'>
          <div style={{ aspectRatio: previewAspect }} className='relative'>
            <img src={value} alt='Preview' className='object-cover w-full h-full' />
            <Button
              type='button'
              variant='destructive'
              size='icon'
              className='absolute top-2 right-2 h-8 w-8'
              onClick={handleClear}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
          <div className='p-2 text-xs text-muted-foreground truncate'>{value}</div>
        </div>
      )}
    </div>
  )
}
