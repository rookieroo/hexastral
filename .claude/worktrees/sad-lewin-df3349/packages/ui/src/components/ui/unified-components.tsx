'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@zhop/ui/components/dialog'
import { Button } from '@zhop/ui/components/button'
import { Badge } from '@zhop/ui/components/badge'
import { Loader2, CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_VARIANTS, type StatusVariant } from '@/lib/design-system'

// Status Icon Component
interface StatusIconProps {
  status: StatusVariant
  className?: string
}

export function StatusIcon({ status, className }: StatusIconProps) {
  const iconClass = cn(STATUS_VARIANTS[status].icon, className)

  switch (status) {
    case 'success':
      return <CheckCircle className={iconClass} />
    case 'warning':
      return <AlertCircle className={iconClass} />
    case 'error':
      return <XCircle className={iconClass} />
    case 'info':
      return <Info className={iconClass} />
    default:
      return <Info className={iconClass} />
  }
}

// Status Badge Component
interface StatusBadgeProps {
  status: StatusVariant
  children: React.ReactNode
  className?: string
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <Badge variant='outline' className={cn(STATUS_VARIANTS[status].badge, className)}>
      {children}
    </Badge>
  )
}

// Unified Confirmation Dialog
interface UnifiedConfirmationDialogProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => Promise<void> | void
  variant?: 'default' | 'destructive'
}

export function UnifiedConfirmationDialog({
  trigger,
  open: externalOpen,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'default',
}: UnifiedConfirmationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const isControlled = externalOpen !== undefined
  const open = isControlled ? externalOpen : internalOpen
  const setOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch (error) {
      console.error('Error in confirmation action:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700'>
        <DialogHeader>
          <DialogTitle className='text-gray-900 dark:text-gray-100'>{title}</DialogTitle>
          <DialogDescription className='text-gray-600 dark:text-gray-400'>
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className='gap-2'>
          <Button
            variant='outline'
            onClick={() => setOpen(false)}
            disabled={loading}
            className='bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={loading}
            className={
              variant === 'destructive'
                ? cn(
                    STATUS_VARIANTS.error.background,
                    STATUS_VARIANTS.error.text,
                    'hover:opacity-90'
                  )
                : 'bg-gray-900 hover:bg-gray-800 hover:text-white dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900'
            }
          >
            {loading && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Status Card Component
interface StatusCardProps {
  status: StatusVariant
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function StatusCard({ status, title, description, children, className }: StatusCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg p-4 border',
        STATUS_VARIANTS[status].background,
        STATUS_VARIANTS[status].border,
        className
      )}
    >
      <div className='flex items-start gap-3'>
        <StatusIcon status={status} className='w-5 h-5 mt-0.5 flex-shrink-0' />
        <div className='flex-1'>
          <h3 className={cn('font-medium', STATUS_VARIANTS[status].text)}>{title}</h3>
          {description && (
            <p className={cn('text-sm mt-1', STATUS_VARIANTS[status].text, 'opacity-80')}>
              {description}
            </p>
          )}
          {children && <div className='mt-3'>{children}</div>}
        </div>
      </div>
    </div>
  )
}

// Connection Status Indicator
interface ConnectionStatusProps {
  connected: boolean
  configured?: boolean
  className?: string
}

export function ConnectionStatus({
  connected,
  configured = true,
  className,
}: ConnectionStatusProps) {
  const getStatus = (): StatusVariant => {
    if (connected && configured) return 'success'
    if (connected && !configured) return 'warning'
    return 'neutral'
  }

  const getStatusText = () => {
    if (connected && configured) return 'Active'
    if (connected && !configured) return 'Setup Required'
    return 'Not Connected'
  }

  const status = getStatus()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <StatusIcon status={status} className='w-4 h-4' />
      <StatusBadge status={status}>{getStatusText()}</StatusBadge>
    </div>
  )
}
