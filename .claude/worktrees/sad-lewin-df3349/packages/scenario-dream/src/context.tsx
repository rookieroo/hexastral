import type { ReactNode } from 'react'
import { createContext, useContext, useMemo } from 'react'
import type { DreamScenarioApi } from './types'

export type DreamScenarioContextValue = {
  api: DreamScenarioApi
  locale: string
}

const DreamScenarioContext = createContext<DreamScenarioContextValue | null>(null)

export function DreamScenarioProvider({
  api,
  locale,
  children,
}: {
  api: DreamScenarioApi
  locale: string
  children: ReactNode
}) {
  const value = useMemo(() => ({ api, locale }), [api, locale])
  return <DreamScenarioContext.Provider value={value}>{children}</DreamScenarioContext.Provider>
}

export function useDreamScenario(): DreamScenarioContextValue {
  const ctx = useContext(DreamScenarioContext)
  if (!ctx) {
    throw new Error('useDreamScenario must be used within DreamScenarioProvider')
  }
  return ctx
}
