/**
 * Report chapter LLM output schema.
 *
 * A single flexible shape used by all 6 chapters in the deep report. Each
 * chapter populates the same envelope, with `sections` carrying the bulk of
 * the chapter's narrative. iOS renders this as a generic chapter card; per-
 * chapter visual specialization can layer on additional fields later without
 * breaking storage compatibility.
 */

import { z } from 'zod/v4'

export const reportChapterSectionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
})

export const reportChapterOutputSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  sections: z.array(reportChapterSectionSchema).min(1),
  highlights: z.array(z.string()).default([]),
  watchOuts: z.array(z.string()).default([]),
})

export type ReportChapterOutput = z.infer<typeof reportChapterOutputSchema>
export type ReportChapterSection = z.infer<typeof reportChapterSectionSchema>
