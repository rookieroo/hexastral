/**
 * SKU output schemas — centralised re-exports + JSON Schema converter.
 *
 * Usage:
 *   import { fateOutputSchema, toJsonSchema } from '../schemas'
 *   const responseSchema = toJsonSchema(fateOutputSchema)   // → Gemini-compatible JSON Schema
 *   fateOutputSchema.parse(rawLlmOutput)                    // → throws on invalid shape
 */

import { z } from 'zod/v4'

export { fateOutputSchema, type FateOutput } from './fate-output'
export { hehunOutputSchema, type HehunOutput } from './hehun-output'
export { physiognomyOutputSchema, type PhysiognomyOutput } from './physiognomy-output'
export {
  previewEssenceSchema,
  dimensionEnum,
  directionEnum,
  type PreviewEssence,
  type DimensionPulse,
  type Dimension,
  type Direction,
} from './preview-essence'
export {
  signalOutputSchema,
  signalEnergyLevelEnum,
  signalWuxingEnum,
  type SignalOutput,
  type SignalEnergyLevel,
  type SignalWuxing,
} from './signal-output'
export {
  reportChapterOutputSchema,
  reportChapterSectionSchema,
  type ReportChapterOutput,
  type ReportChapterSection,
} from './report-chapter-output'
export { ch4TimelineOutputSchema, type Ch4TimelineOutput } from './ch4-timeline-output'
export { ch5HiddenOutputSchema, type Ch5HiddenOutput } from './ch5-hidden-output'
export { ch6ActionOutputSchema, type Ch6ActionOutput } from './ch6-action-output'

/**
 * Convert a Zod schema to a Gemini-compatible JSON Schema object.
 *
 * Strips the `$schema` key that Zod v4 adds by default — Gemini's
 * responseSchema field does not accept it.
 */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _drop, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>
  return rest
}
