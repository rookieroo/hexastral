/**
 * Shared-element flight bus — carries the "tapped polaroid → report plate"
 * transition across expo-router screens.
 *
 * Two expo-router screens have no common mounted ancestor, so `useMagicMove`
 * (single-tree only) can't span them. Instead we:
 *   1. home measures the tapped polaroid's window rect → `setFlightSource(...)`
 *   2. result measures the plate slot's window rect          → `setFlightTarget(...)`
 *   3. an app-root Modal (above the native stack) flies the actual photo from
 *      source → target, then dissolves into the plate.
 *
 * The bus is a plain module store; the animation lives in
 * `components/SharedElementFlight.tsx`. Both screens can register at mount time
 * without fighting navigation order.
 */

export type FlightRect = { x: number; y: number; w: number; h: number }

export type SharedElementSource = {
  /** Local photo URI to fly (the tapped polaroid). */
  uri: string
  /** Source window rect (from `measure`). */
  rect: FlightRect
  /** Reading + tapped part so the report knows where to land. */
  readingId: string
  part: 'face' | 'palm_l' | 'palm_r'
}

export type FlightState = {
  source: SharedElementSource | null
  /** Report plate slot rect (measured after the report mounts). */
  target: FlightRect | null
}

let state: FlightState = { source: null, target: null }
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function subscribeFlight(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function readFlight(): FlightState {
  return state
}

/** Home registers the tapped polaroid + its measured window rect. */
export function setFlightSource(source: SharedElementSource): void {
  state = { source, target: null }
  emit()
}

/** Result registers the plate slot's measured window rect. */
export function setFlightTarget(rect: FlightRect): void {
  state = { ...state, target: rect }
  emit()
}

/** True while a source is queued (home tap) and no target has landed yet. */
export function flightPending(): boolean {
  return state.source !== null && state.target === null
}

/** Clear after the flight. Next tap re-registers a fresh source. */
export function clearFlight(): void {
  state = { source: null, target: null }
  emit()
}

/** Retry `fn` until success or attempts exhausted (plate measure after mount). */
export function retriesRemaining(fn: () => void, attempts = 5, delayMs = 120) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let tries = 0
  const run = () => {
    if (timer) return
    fn()
    tries += 1
    if (tries < attempts) {
      timer = setTimeout(() => {
        timer = null
        run()
      }, delayMs)
    }
  }
  return {
    run,
    cancel: () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    },
  }
}
