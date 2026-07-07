/**
 * Fēng (風) product-level constants shared by client + server.
 *
 * These are NOT compute primitives — they are cross-cutting product constraints
 * that must agree between the upload UI (feng-app), the API validation schema
 * (hexastral-api), and the pricing tiers. Kept here because @zhop/astro-core is
 * the single package both the app and the API already depend on.
 */

/**
 * Maximum floor-plan images per site (1 = apartment, up to 6 = large villa /
 * multi-floor). Enforced client-side (picker limit + add-tile hide), server-side
 * (Zod `.max()`), and mirrored by the top pricing tier (`villa_l` covers 4–6).
 */
export const MAX_FLOORPLAN_IMAGES = 6
