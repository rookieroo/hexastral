export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

export const STATUS_VARIANTS = {
  success: {
    background: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-900',
    text: 'text-green-800 dark:text-green-300',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    icon: 'text-green-600 dark:text-green-400',
  },
  warning: {
    background: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-900',
    text: 'text-yellow-800 dark:text-yellow-300',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    icon: 'text-yellow-600 dark:text-yellow-400',
  },
  error: {
    background: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-900',
    text: 'text-red-800 dark:text-red-300',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: 'text-red-600 dark:text-red-400',
  },
  info: {
    background: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-900',
    text: 'text-blue-800 dark:text-blue-300',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  neutral: {
    background: 'bg-gray-50 dark:bg-gray-900/20',
    border: 'border-gray-200 dark:border-gray-800',
    text: 'text-gray-800 dark:text-gray-300',
    badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    icon: 'text-gray-600 dark:text-gray-400',
  },
}
