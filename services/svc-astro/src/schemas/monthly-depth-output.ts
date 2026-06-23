import { z } from 'zod/v4'

/**
 * 流年深读 (monthly depth) output — the Pro LLM enrichment of the deterministic
 * 本月运势 card. The free card already gives the month's tone + 十神 framing; this
 * deepens it into a short multi-theme read grounded in the chart's 流月 vs 命盘.
 * Kept deliberately compact (one screen) — it's a monthly hook, not a full chapter.
 */
export const monthlyDepthOutputSchema = z.object({
  /** A short evocative title for the month, e.g. "蓄力待时" / "A month to bank strength". */
  title: z.string().min(1),
  /** 2–3 sentence opening that frames the month against the chart. */
  overview: z.string().min(1),
  /** The month's threads — each a small heading + a grounded paragraph. */
  themes: z
    .array(
      z.object({
        label: z.string().min(1),
        body: z.string().min(1),
      })
    )
    .min(2)
    .max(4),
  /** One concrete, actionable line for the month. */
  advice: z.string().min(1),
  /** One caution / thing to watch for. */
  watchFor: z.string().min(1),
})

export type MonthlyDepthOutput = z.infer<typeof monthlyDepthOutputSchema>
