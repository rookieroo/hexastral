/**
 * useProfile — shared hook for user profile state (avatar, display name, etc.)
 *
 * Reads from AsyncStorage on mount and keeps state fresh across all screens.
 * Also syncs profile changes to D1 via PATCH /api/user/:userId/profile so
 * the same user on a second device sees the latest data.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQueryClient } from '@tanstack/react-query'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { config } from '@/lib/config'
import { signRequest } from '@/lib/hmac'
import { getAvatarIndex } from '@/lib/ux/avatar'

export const PROFILE_KEY = 'hexastral_profile'

export interface UserProfile {
  /** 公开昵称 — 用户在 Profile 自由编辑，展示在公开页与问候语 */
  displayName: string
  /** 真实姓名 — 占卜与命理参数；onboarding NameStep 录入，Profile 可修改 */
  name: string
  username: string
  chartPublic: boolean
  photoUri: string | null
  avatarKey?: string | null
  /** Phone from server only — profile sheet does not collect unverified numbers */
  phone: string | null
}

export const DEFAULT_PROFILE: UserProfile = {
  displayName: '',
  name: '',
  username: '',
  chartPublic: false,
  photoUri: null,
  avatarKey: null,
  phone: null,
}

export interface UseProfileResult {
  profile: UserProfile
  /** Update local state only (no AsyncStorage write — for controlled TextInput) */
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>
  /** Stable avatar design index (0–7) derived from userId */
  avatarIndex: number
  /** Shortcut: photoUri if set, otherwise null (use DefaultAvatar with avatarIndex) */
  photoUri: string | null
  /** Save a partial profile update to AsyncStorage and sync to D1. Returns false if D1 sync fails. */
  saveProfile: (update: Partial<UserProfile>) => Promise<boolean>
  /** Reload profile from AsyncStorage (call after external mutations) */
  reloadProfile: () => Promise<void>
}

/** GET /api/user fields that override stale AsyncStorage — clears ghost username after reinstall/onboarding. */
export interface ServerProfileSnapshot {
  username?: string | null
  chartPublic?: boolean | null
  displayName?: string | null
  name?: string | null
}

export function applyServerSnapshotToProfile(
  prev: UserProfile,
  server: ServerProfileSnapshot
): UserProfile {
  const next = { ...prev }
  let changed = false

  if (server.username !== undefined) {
    const u = (server.username ?? '').trim()
    if (next.username !== u) {
      next.username = u
      changed = true
    }
  }

  if (server.chartPublic !== undefined) {
    const cp = server.chartPublic === true
    if (next.chartPublic !== cp) {
      next.chartPublic = cp
      changed = true
    }
  }

  if (server.displayName !== undefined) {
    const d = server.displayName == null ? '' : String(server.displayName).trim()
    if (next.displayName !== d) {
      next.displayName = d
      changed = true
    }
  }
  if (server.name !== undefined) {
    const n = server.name == null ? '' : String(server.name).trim()
    if (next.name !== n) {
      next.name = n
      changed = true
    }
  }

  return changed ? next : prev
}

export async function persistProfileToStorage(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export async function clearStoredProfile(): Promise<void> {
  await AsyncStorage.removeItem(PROFILE_KEY)
}

export function useProfile(userId: string | null | undefined): UseProfileResult {
  const queryClient = useQueryClient()
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE)
  // Ref always holds the latest profile so saveProfile never uses a stale closure
  const profileRef = useRef<UserProfile>(DEFAULT_PROFILE)
  profileRef.current = profile

  const reloadProfile = useCallback(async () => {
    const raw = await AsyncStorage.getItem(PROFILE_KEY)
    if (raw) {
      try {
        setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(raw) })
      } catch {
        // malformed JSON — ignore
      }
    }
  }, [])

  // Mount-only hydration. Previously the effect depended on the unmemoized
  // `reloadProfile` function, which was recreated every render — causing the
  // effect to re-fire on every keystroke and overwrite local edits with the
  // pre-edit AsyncStorage snapshot (Profile fields appeared to "instantly clear").
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only is intentional
  useEffect(() => {
    reloadProfile()
  }, [])

  const saveProfile = async (update: Partial<UserProfile>): Promise<boolean> => {
    // Compute `next` eagerly from the ref (always current) — avoids the React 18
    // auto-batching race where the functional-updater callback runs after await points.
    const next = { ...profileRef.current, ...update }
    setProfile(next)

    // Sync to D1 so other devices pick up the latest state
    if (userId) {
      const patch: Record<string, unknown> = {}
      if (update.displayName !== undefined) patch.displayName = update.displayName
      if (update.name !== undefined) patch.name = update.name
      if (update.username !== undefined) patch.username = update.username
      if (update.chartPublic !== undefined) patch.chartPublic = update.chartPublic
      if (update.phone !== undefined) patch.phone = update.phone
      if (update.avatarKey !== undefined) patch.avatarKey = update.avatarKey
      // photoUri is mapped to avatarKey if it's an uploaded remote URL, otherwise it's just local preview state
      if (update.photoUri && update.avatarKey === null) patch.avatarKey = null

      if (Object.keys(patch).length > 0) {
        const body = JSON.stringify(patch)
        const path = `/api/user/${userId}/profile`
        const sig = await signRequest({ body, userId, method: 'PATCH', path })
        if (!sig) {
          console.warn('[profile] signRequest returned null — missing deviceSecret')
          return false
        }
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
          ...sig,
        }
        try {
          const res = await fetch(`${config.apiUrl}${path}`, {
            method: 'PATCH',
            headers,
            body,
          })
          if (!res.ok) {
            const text = await res.text().catch(() => '')
            console.warn('[profile] sync failed:', res.status, text)
            return false
          }
          void queryClient.invalidateQueries({ queryKey: ['user', userId] })
        } catch (err) {
          console.warn('[profile] sync failed:', err)
          return false
        }
      }
    }

    // Persist to AsyncStorage only after successful API sync (or if no userId)
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next))
    return true
  }

  const avatarIndex = getAvatarIndex(userId ?? 'guest')

  return {
    profile,
    setProfile,
    avatarIndex,
    photoUri: profile.photoUri,
    saveProfile,
    reloadProfile,
  }
}
