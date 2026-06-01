/**
 * Versioned-store helper — atomic flip+insert for append-only LLM-output tables.
 *
 * Tables `report_chapters` and `daily_signals` use append-only versioning: the
 * "current" row carries `is_current=1`, and any new generation must atomically
 * (1) flip the prior current row(s) to `is_current=0` and (2) insert the new row.
 *
 * Both writes go through `db.batch()` so they land in a single D1 transaction;
 * a partial write would otherwise leave the table with zero or two current rows.
 */

import type { SQL } from 'drizzle-orm'
import type { SQLiteTable } from 'drizzle-orm/sqlite-core'
import type { AppDb } from '../infra-types'

/**
 * Atomically flip the prior current row to history and insert the new current row.
 *
 * The caller supplies a `currentScope` predicate that uniquely identifies the existing
 * `is_current=1` row (typically `and(eq(table.userId, userId), eq(table.chapter, slug),
 * eq(table.isCurrent, true))`). The new row is inserted via the table's default
 * `is_current` column (defaulted to `true` in schema).
 */
export async function markCurrentAndInsert<TTable extends SQLiteTable>(
  db: AppDb,
  table: TTable,
  currentScope: SQL,
  newRow: TTable['$inferInsert']
): Promise<void> {
  await db.batch([
    db
      .update(table)
      // biome-ignore lint/suspicious/noExplicitAny: dynamic table.set requires loose typing
      .set({ isCurrent: false } as any)
      .where(currentScope),
    db.insert(table).values(newRow),
  ])
}
