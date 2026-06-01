import { z } from 'zod/v4'
import { reportChapterOutputSchema } from './report-chapter-output'

const yearlyRhythmItemSchema = z.object({
  period: z.string().min(1),
  theme: z.string().min(1),
  intensity: z.enum(['low', 'medium', 'high']),
})

const decisionWindowItemSchema = z.object({
  timeframe: z.string().min(1),
  domain: z.string().min(1),
  description: z.string().min(1),
})

export const ch4TimelineOutputSchema = reportChapterOutputSchema.extend({
  currentDayunOverview: z.string().min(1),
  yearlyRhythm: z.array(yearlyRhythmItemSchema).min(2).max(6),
  decisionWindows: z.array(decisionWindowItemSchema).min(1).max(5),
  oneThingToFocus: z.string().min(1),
})

export type Ch4TimelineOutput = z.infer<typeof ch4TimelineOutputSchema>
