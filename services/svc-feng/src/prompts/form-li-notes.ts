import { z } from 'zod'

export const BAGUA_PALACES = ['坎', '艮', '震', '巽', '离', '離', '坤', '兑', '兌', '乾'] as const

export const FormLiNotesSchema = z.object({
  schemaVersion: z.literal(1),
  locale: z.string().min(1),
  bullets: z
    .array(
      z.object({
        palace: z
          .string()
          .min(1)
          .refine(
            (p) => (BAGUA_PALACES as readonly string[]).includes(p),
            'palace must be a bagua palace'
          ),
        seen: z.string().min(1).max(80),
        linkToChart: z.string().min(1).max(80),
        severity: z.enum(['info', 'watch', 'risk']),
      })
    )
    .min(1)
    .max(8),
  omittedSignals: z.array(z.string()),
  inventedFacing: z.literal(false),
})

export type FormLiNotes = z.infer<typeof FormLiNotesSchema>

export const FORM_LI_SYSTEM_PROMPT = `You are a cultural feng-shui study assistant writing SHORT 形理对照 notes.

You receive a COMPACT pack: vision landform features + deterministic chart facts (patterns, priority palace combinations with readingPublic, formLi top items, data-quality notes). Sit/face identity is READ-ONLY — never invent or change 坐向.

Output JSON matching the schema:
  schemaVersion: 1
  locale: echo the user locale
  bullets: 1–8 items, each { palace, seen, linkToChart, severity }
    - palace: one of 坎艮震巽离坤兑乾
    - seen: ≤80 chars — only what the vision pack shows
    - linkToChart: ≤80 chars — link to patterns / readingPublic / formLi, or exactly "no_chart_link"
    - severity: info | watch | risk
  omittedSignals: string[] (e.g. street_skipped_apartment)
  inventedFacing: must be the boolean false

Rules:
- Do NOT invent sit/face degrees or claim annotated overlays on imagery.
- Do NOT use medical classical wording (重病/孕妇/性病/中毒/血光…).
- Do NOT recommend talismans or promise 改运/发财.
- Prefer fewer precise bullets over vague filler.`

export function buildFormLiUserPrompt(compactJson: string, locale: string): string {
  return [
    `Locale: ${locale}`,
    '',
    '## Compact vision + compute pack',
    compactJson,
    '',
    'Write FormLiNotes JSON now. inventedFacing must be false.',
  ].join('\n')
}

export const FORM_LI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    schemaVersion: { type: 'INTEGER' },
    locale: { type: 'STRING' },
    bullets: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          palace: { type: 'STRING' },
          seen: { type: 'STRING' },
          linkToChart: { type: 'STRING' },
          severity: { type: 'STRING', enum: ['info', 'watch', 'risk'] },
        },
        required: ['palace', 'seen', 'linkToChart', 'severity'],
      },
    },
    omittedSignals: { type: 'ARRAY', items: { type: 'STRING' } },
    inventedFacing: { type: 'BOOLEAN' },
  },
  required: ['schemaVersion', 'locale', 'bullets', 'omittedSignals', 'inventedFacing'],
}
