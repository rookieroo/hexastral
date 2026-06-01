/**
 * useAuthGate — inline auth gate for privileged actions
 *
 * Usage:
 *   const { gate, authGateElement } = useAuthGate()
 *   // ...
 *   <Button onPress={() => gate(handleAnalyze)} />
 *   {authGateElement}
 *
 * Rules:
 *  - Full auth users (apple_ / google_): action runs immediately
 *  - Guest users (guest_*) or unauthenticated: AuthGateModal shown first,
 *    action runs after successful sign-in
 */

import { useCallback, useRef, useState } from 'react'
import { AuthGateModal } from '@/components/auth/AuthGateModal'
import { useAuth } from '@/lib/auth'

type Action = () => void | Promise<void>

interface UseAuthGateResult {
  /**
   * Wrap an action with the auth gate.
   * If the user is a guest / unauthenticated the modal is shown first
   * and the action is deferred until sign-in succeeds.
   */
  gate: (action: Action) => void
  /** JSX element — render once inside the screen */
  authGateElement: React.ReactElement
}

function isGuestOrAnon(userId: string | null): boolean {
  if (!userId) return true
  return userId.startsWith('guest_')
}

export function useAuthGate(): UseAuthGateResult {
  const { userId } = useAuth()
  const [gateVisible, setGateVisible] = useState(false)
  const pendingAction = useRef<Action | null>(null)

  const gate = useCallback(
    (action: Action) => {
      if (!isGuestOrAnon(userId)) {
        void action()
        return
      }
      pendingAction.current = action
      setGateVisible(true)
    },
    [userId]
  )

  const handleAuthSuccess = useCallback(() => {
    const action = pendingAction.current
    pendingAction.current = null
    if (action) {
      // Defer one tick to allow auth state to propagate before running the action
      setTimeout(() => void action(), 0)
    }
  }, [])

  const handleDismiss = useCallback(() => {
    pendingAction.current = null
    setGateVisible(false)
  }, [])

  const authGateElement = (
    <AuthGateModal
      visible={gateVisible}
      onDismiss={handleDismiss}
      onAuthSuccess={handleAuthSuccess}
    />
  )

  return { gate, authGateElement }
}
