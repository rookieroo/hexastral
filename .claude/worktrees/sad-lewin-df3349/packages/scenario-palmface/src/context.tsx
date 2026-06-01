import type { ReactNode } from 'react'
import { createContext, useContext, useMemo } from 'react'
import type { PalmfaceScenarioApi } from './types'

const PalmfaceScenarioContext = createContext<PalmfaceScenarioApi | null>(null)

export function PalmfaceScenarioProvider({ api, children }: { api: PalmfaceScenarioApi; children: ReactNode }) {
  const value = useMemo(() => api, [api])
  return <PalmfaceScenarioContext.Provider value={value}>{children}</PalmfaceScenarioContext.Provider>
}

export function usePalmfaceScenario(): PalmfaceScenarioApi {
  const ctx = useContext(PalmfaceScenarioContext)
  if (!ctx) {
    throw new Error('usePalmfaceScenario must be used within PalmfaceScenarioProvider')
  }
  return ctx
}
