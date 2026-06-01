/**
 * Schema registry — re-exports common + per-domain Zod schemas.
 *
 * Import from this index, not from per-file paths, so the registry can
 * reorganize without breaking consumers:
 *
 *   import { idSchema, personBirthSchema, paginationSchema } from '../lib/schemas'
 *
 * Per phase-f-plan §3.3.
 */

export * from './common'

// Future domain modules (write as routes migrate):
//   export * as bonds from './bonds'
//   export * as feng from './feng'
//   export * as readings from './readings'
//   export * as share from './share'
