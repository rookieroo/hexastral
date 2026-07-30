import { describe, expect, test } from 'bun:test'
import { classifyBirthEdit } from './birth-edit-quota'
import {
  birthSyncPreferencePatch,
  birthSyncWriteStamp,
  evaluateBirthSyncAccess,
  normalizeBirthSyncPreferences,
} from './birth-sync-policy'

describe('birth-sync-policy', () => {
  test('empty when no solar date', () => {
    expect(
      evaluateBirthSyncAccess(
        {
          birthSolarDate: null,
          birthSourceApp: null,
          birthOwnerInstallationId: null,
          birthMultiDeviceSyncEnabled: true,
          birthCrossAppSyncEnabled: false,
        },
        { targetApp: 'auspice', installationId: 'a' }
      )
    ).toBe('empty')
  })

  test('legacy row without source is available to any app', () => {
    expect(
      evaluateBirthSyncAccess(
        {
          birthSolarDate: '1990-1-1',
          birthSourceApp: null,
          birthOwnerInstallationId: null,
          birthMultiDeviceSyncEnabled: true,
          birthCrossAppSyncEnabled: false,
        },
        { targetApp: 'feng', installationId: 'x' }
      )
    ).toBe('available')
  })

  test('cross-app disabled blocks other apps', () => {
    expect(
      evaluateBirthSyncAccess(
        {
          birthSolarDate: '1990-1-1',
          birthSourceApp: 'auspice',
          birthOwnerInstallationId: null,
          birthMultiDeviceSyncEnabled: true,
          birthCrossAppSyncEnabled: false,
        },
        { targetApp: 'feng', installationId: 'x' }
      )
    ).toBe('cross_app_disabled')
  })

  test('cross-app enabled allows other apps', () => {
    expect(
      evaluateBirthSyncAccess(
        {
          birthSolarDate: '1990-1-1',
          birthSourceApp: 'auspice',
          birthOwnerInstallationId: null,
          birthMultiDeviceSyncEnabled: true,
          birthCrossAppSyncEnabled: true,
        },
        { targetApp: 'feng', installationId: 'x' }
      )
    ).toBe('available')
  })

  test('multi-device off blocks other installs on same app', () => {
    expect(
      evaluateBirthSyncAccess(
        {
          birthSolarDate: '1990-1-1',
          birthSourceApp: 'auspice',
          birthOwnerInstallationId: 'phone-a',
          birthMultiDeviceSyncEnabled: false,
          birthCrossAppSyncEnabled: false,
        },
        { targetApp: 'auspice', installationId: 'phone-b' }
      )
    ).toBe('multi_device_disabled')
  })

  test('multi-device off allows owner install', () => {
    expect(
      evaluateBirthSyncAccess(
        {
          birthSolarDate: '1990-1-1',
          birthSourceApp: 'auspice',
          birthOwnerInstallationId: 'phone-a',
          birthMultiDeviceSyncEnabled: false,
          birthCrossAppSyncEnabled: false,
        },
        { targetApp: 'auspice', installationId: 'phone-a' }
      )
    ).toBe('available')
  })

  test('defaults: multi-device on, cross-app off', () => {
    const prefs = normalizeBirthSyncPreferences({
      birthSourceApp: null,
      birthOwnerInstallationId: null,
      birthMultiDeviceSyncEnabled: null,
      birthCrossAppSyncEnabled: null,
      birthUpdatedAt: null,
    })
    expect(prefs.multiDeviceSyncEnabled).toBe(true)
    expect(prefs.crossAppSyncEnabled).toBe(false)
  })

  test('write stamp clears owner when multi-device on', () => {
    expect(
      birthSyncWriteStamp({
        targetApp: 'auspice',
        installationId: 'i1',
        multiDeviceSyncEnabled: true,
        nowIso: '2026-01-01T00:00:00.000Z',
      })
    ).toEqual({
      birthSourceApp: 'auspice',
      birthOwnerInstallationId: null,
      birthUpdatedAt: '2026-01-01T00:00:00.000Z',
    })
  })

  test('preference patch locks owner when turning multi-device off', () => {
    expect(
      birthSyncPreferencePatch({
        installationId: 'i1',
        multiDeviceSyncEnabled: false,
        priorMultiDevice: true,
        priorOwner: null,
      })
    ).toEqual({
      birthMultiDeviceSyncEnabled: false,
      birthOwnerInstallationId: 'i1',
    })
  })
})

describe('birth-edit-quota nullable time', () => {
  test('first add with null timeIndex', () => {
    expect(
      classifyBirthEdit(
        {
          birthSolarDate: null,
          birthTimeIndex: null,
          birthGender: null,
          birthEditUsed: false,
        },
        { birthSolarDate: '1990-1-1', birthTimeIndex: null, gender: null }
      )
    ).toBe('first_add')
  })

  test('date-only prior counts; changing time consumes quota', () => {
    expect(
      classifyBirthEdit(
        {
          birthSolarDate: '1990-1-1',
          birthTimeIndex: null,
          birthGender: null,
          birthEditUsed: false,
        },
        { birthSolarDate: '1990-1-1', birthTimeIndex: 3, gender: null }
      )
    ).toBe('consume_quota')
  })
})
