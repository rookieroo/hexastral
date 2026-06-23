/**
 * @zhop/scenario-yuan — the shared PERSONAL-reading layer (one person's 八字 + 紫微).
 *
 * The single-person mirror of @zhop/scenario-kindred (synastry): the chart compute,
 * the 命 report, and the read surfaces that BOTH Yuel's solo reading and Yuun's
 * personal deep read draw on. Phase 0 extracts the pure, app-agnostic compute first
 * (no config / signer / theme coupling); the report components + cache follow with
 * dependency injection.
 */

export * from './natal'
export * from './personality-presets'
export * from './reading'
export * from './reading-cache'
export * from './teaser-narrator'
export * from './ziwei'
