/**
 * Casting round lifecycle for 3D physics scene coordination.
 * Parent owns ritual guards (question, ack, cooldown); this tracks toss UX only.
 */

export type CastingPhase = 'idle' | 'tossing' | 'settling' | 'snapping'

export interface CastingMachineState {
  phase: CastingPhase
  tossRevision: number
}

export function initialCastingMachine(): CastingMachineState {
  return { phase: 'idle', tossRevision: 0 }
}

export function beginToss(state: CastingMachineState): CastingMachineState {
  return {
    phase: 'tossing',
    tossRevision: state.tossRevision + 1,
  }
}

export function markSettling(state: CastingMachineState): CastingMachineState {
  return { ...state, phase: 'settling' }
}

export function markSnapping(state: CastingMachineState): CastingMachineState {
  return { ...state, phase: 'snapping' }
}

export function markIdle(state: CastingMachineState): CastingMachineState {
  return { ...state, phase: 'idle' }
}
