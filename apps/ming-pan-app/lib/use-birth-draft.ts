import { getLocalBirthDraft, type LocalBirthDraft } from '@zhop/satellite-runtime'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'

import { PORTFOLIO_STORAGE_PREFIX } from './growth-config'

export type BirthDraftState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; draft: LocalBirthDraft }

/** Loads the local birth draft and refreshes on screen focus (after /birth edits). */
export function useBirthDraft(): BirthDraftState {
  const [state, setState] = useState<BirthDraftState>({ status: 'loading' })

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        const draft = await getLocalBirthDraft(PORTFOLIO_STORAGE_PREFIX)
        if (!active) return
        setState(draft ? { status: 'ready', draft } : { status: 'empty' })
      })()
      return () => {
        active = false
      }
    }, [])
  )

  return state
}
