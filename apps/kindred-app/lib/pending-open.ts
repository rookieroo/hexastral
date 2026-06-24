/**
 * Pending-open-bond signal — a one-shot hand-off so a flow that finishes on
 * ANOTHER screen (the invite accept) can ask the home to open a specific bond's
 * report as its in-place 水墨 overlay, instead of pushing a second `/(bonds)/[id]`
 * route on top of the home.
 *
 * Why: after "Open the thread" the accept screen reset the stack to the home and
 * THEN pushed the bond route — a redundant route on top of a freshly-replaced
 * home, and a hard jump into the report (2026-06 feedback: "很容易产生多余的路由栈…
 * 没法丝滑的跳到报告页"). Now the accept screen drops the bond id here and resets to
 * the home; the home consumes it on focus and blooms the report overlay open — the
 * same smooth transition a thread tap uses. Module-scoped so it survives the home
 * remounting after the stack reset. Mirrors lib/splash-control.ts.
 */

let pendingBondId: string | null = null

/** Ask the next home focus to open this bond's report overlay. */
export function setPendingOpenBond(id: string): void {
  pendingBondId = id
}

/** Read-and-clear the pending bond id (null when none). */
export function consumePendingOpenBond(): string | null {
  const id = pendingBondId
  pendingBondId = null
  return id
}
