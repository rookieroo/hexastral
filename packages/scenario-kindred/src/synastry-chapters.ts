/**
 * Synastry report chapter counts — mirror apps/hexastral-api/src/lib/synastry-chapters.ts.
 * Client uses these so progressive skeletons don't collapse when DB still has only ch1.
 */

/** Chapters a free viewer may read (halved ch1) before the unlock wall. */
export const SYNASTRY_FREE_CHAPTERS = 1
/** Total chapters svc-astro generates for a full synastry report. */
export const SYNASTRY_TOTAL_CHAPTERS = 6
