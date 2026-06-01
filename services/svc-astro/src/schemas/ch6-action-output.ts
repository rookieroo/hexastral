import { z } from 'zod/v4'
import { reportChapterOutputSchema } from './report-chapter-output'

const immediateActionSchema = z.object({
  description: z.string().min(1),
  timeframe: z.enum(['today', 'thisWeek']),
})

const thirtyDayFocusSchema = z.object({
  domain: z.string().min(1),
  action: z.string().min(1),
  rationale: z.string().min(1),
})

const ninetyDayDirectionSchema = z.object({
  domain: z.string().min(1),
  description: z.string().min(1),
})

const delayItemSchema = z.object({
  description: z.string().min(1),
  reason: z.string().min(1),
})

export const ch6ActionOutputSchema = reportChapterOutputSchema.extend({
  immediateAction: immediateActionSchema,
  thirtyDayFocus: z.array(thirtyDayFocusSchema).min(1).max(5),
  ninetyDayDirection: ninetyDayDirectionSchema,
  delayItem: delayItemSchema,
})

export type Ch6ActionOutput = z.infer<typeof ch6ActionOutputSchema>
