import { describe, expect, it } from 'bun:test'
import {
  LANTAI_FREE_SLOT_CAP,
  lantaiSlotAllowed,
  lantaiWorkspaceAllowed,
  resolveLantaiAccess,
} from './lantai-access'

describe('lantai access union', () => {
  it('treats unlock OR pro as unlimited slots', () => {
    expect(resolveLantaiAccess(['lantai_unlock']).unlimitedSlots).toBe(true)
    expect(resolveLantaiAccess(['lantai_pro']).unlimitedSlots).toBe(true)
    expect(resolveLantaiAccess(['lantai_workspaces']).unlimitedSlots).toBe(true)
    expect(resolveLantaiAccess([]).unlimitedSlots).toBe(false)
  })

  it('does not let unlock grant AI or extra workspaces', () => {
    const unlock = resolveLantaiAccess(['lantai_unlock'])
    expect(unlock.ai).toBe(false)
    expect(unlock.unlimitedWorkspaces).toBe(false)
    expect(resolveLantaiAccess(['lantai_pro']).ai).toBe(true)
    expect(resolveLantaiAccess(['lantai_workspaces']).unlimitedWorkspaces).toBe(true)
  })

  it('caps free slots at 2 including revoked (caller passes createdCount)', () => {
    const free = resolveLantaiAccess([])
    expect(lantaiSlotAllowed(free, 0)).toBe(true)
    expect(lantaiSlotAllowed(free, LANTAI_FREE_SLOT_CAP - 1)).toBe(true)
    expect(lantaiSlotAllowed(free, LANTAI_FREE_SLOT_CAP)).toBe(false)
    expect(lantaiSlotAllowed(resolveLantaiAccess(['lantai_pro']), 99)).toBe(true)
  })

  it('caps free workspaces at 1', () => {
    const free = resolveLantaiAccess([])
    expect(lantaiWorkspaceAllowed(free, 0)).toBe(true)
    expect(lantaiWorkspaceAllowed(free, 1)).toBe(false)
  })
})
