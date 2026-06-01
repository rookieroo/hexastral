/**
 * SKU output schemas — centralised re-exports + JSON Schema converter.
 *
 * Usage:
 *   import { fateOutputSchema, toJsonSchema } from '../schemas'
 *   const responseSchema = toJsonSchema(fateOutputSchema)   // → Gemini-compatible JSON Schema
 *   fateOutputSchema.parse(rawLlmOutput)                    // → throws on invalid shape
 */

import { z } from 'zod/v4'

export { type Ch4TimelineOutput, ch4TimelineOutputSchema } from './ch4-timeline-output'
export { type Ch5HiddenOutput, ch5HiddenOutputSchema } from './ch5-hidden-output'
export { type Ch6ActionOutput, ch6ActionOutputSchema } from './ch6-action-output'
export { type FateOutput, fateOutputSchema } from './fate-output'
export { type HehunOutput, hehunOutputSchema } from './hehun-output'
export { type PhysiognomyOutput, physiognomyOutputSchema } from './physiognomy-output'
export {
  type Dimension,
  type DimensionPulse,
  type Direction,
  dimensionEnum,
  directionEnum,
  type PreviewEssence,
  previewEssenceSchema,
} from './preview-essence'
export {
  type ReportChapterOutput,
  type ReportChapterSection,
  reportChapterOutputSchema,
  reportChapterSectionSchema,
} from './report-chapter-output'
export {
  type SignalEnergyLevel,
  type SignalOutput,
  type SignalWuxing,
  signalEnergyLevelEnum,
  signalOutputSchema,
  signalWuxingEnum,
} from './signal-output'

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
