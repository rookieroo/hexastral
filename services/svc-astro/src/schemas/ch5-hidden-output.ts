import { z } from 'zod/v4'
import { reportChapterOutputSchema } from './report-chapter-output'

const tensionPointSchema = z.object({
  source: z.string().min(1),
  sourceType: z.enum(['huaJi', 'shenSha', 'xingChong', 'fiveElement', 'other']),
  impactDomain: z.string().min(1),
  mechanism: z.string().min(1),
  currentlyActive: z.boolean(),
})

export const ch5HiddenOutputSchema = reportChapterOutputSchema.extend({
  tensionPoints: z.array(tensionPointSchema).min(1).max(6),
  dormantPattern: z.string().min(1),
})

export type Ch5HiddenOutput = z.infer<typeof ch5HiddenOutputSchema>
