/**
 * Fēng (風) product-level constants shared by client + server.
 *
 * These are NOT compute primitives — they are cross-cutting product constraints
 * that must agree between the upload UI (feng-app), the API validation schema
 * (hexastral-api), and the pricing tiers. Kept here because @zhop/astro-core is
 * the single package both the app and the API already depend on.
 */

/**
 * Absolute upload cap for a site's floor plans (large 大平层 / multi-floor villa).
 * Enforced client-side (picker limit + add-tile hide) and server-side (Zod `.max()`).
 * Pricing is keyed by residence type, not image count; this is a pure technical cap.
 */
export const MAX_FLOORPLAN_IMAGES = 6

/**
 * Apartment / compound-unit floor-plan cap. A single unit has one layout, so the
 * base tier is limited to one plan (and skips the street 形煞 pass entirely).
 */
export const APARTMENT_MAX_FLOORPLAN_IMAGES = 1

/**
 * Per-residence upload cap. apartment → 1 (single layout, base tier);
 * flat / villa → MAX (multi-floor / large premium report).
 */
export function maxFloorplanImagesFor(
  residenceType: 'apartment' | 'flat' | 'villa'
): number {
  return residenceType === 'apartment' ? APARTMENT_MAX_FLOORPLAN_IMAGES : MAX_FLOORPLAN_IMAGES
}
