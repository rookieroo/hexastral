/**
 * Global toast singleton — fire-and-forget UX feedback.
 *
 * Usage:
 *   import { showError, showInfo } from '@/lib/ux/toast'
 *   showError('Network failed')
 *
 * The actual rendering happens in `<ErrorToast />` mounted at the root
 * layout. This module is a thin event bus so non-React code (mutations,
 * service callers, query client error handlers) can surface user-facing
 * messages without prop-drilling.
 */

import { logError } from '../logger'

export type ToastKind = 'error' | 'info' | 'success'

export interface ToastPayload {
  id: number
  kind: ToastKind
  message: string
}

type Listener = (toast: ToastPayload) => void

const listeners = new Set<Listener>()
let nextId = 1

function emit(kind: ToastKind, message: string): void {
  const trimmed = message.trim()
  if (!trimmed) return
  const payload: ToastPayload = { id: nextId++, kind, message: trimmed }
  for (const listener of listeners) {
    try {
      listener(payload)
    } catch (err) {
      logError('toast.emit', err)
    }
  }
}

export function showError(message: unknown): void {
  const text =
    message instanceof Error
      ? message.message
      : typeof message === 'string'
        ? message
        : 'Unexpected error'
  emit('error', text)
}

export function showInfo(message: string): void {
  emit('info', message)
}

export function showSuccess(message: string): void {
  emit('success', message)
}

export function subscribeToast(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
