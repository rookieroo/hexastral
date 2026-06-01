import { z } from 'zod/v4'

/** Validates a YYYY-M-D or YYYY-MM-DD date string is a real calendar date */
function isValidDate(str: string): boolean {
  const parts = str.split('-')
  if (parts.length !== 3) return false
  const [y, m, d] = parts.map(Number) as [number, number, number]
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

/** Zod schema for solar date — format + calendar validity */
export const solarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{1,2}-\d{1,2}$/)
  .refine(isValidDate, 'Invalid date')

/** Zod schema for strict YYYY-MM-DD (2-digit month/day) — format + calendar validity */
export const strictDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidDate, 'Invalid date')
