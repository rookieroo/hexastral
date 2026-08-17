/**
 * React context for almanac paper theme (classic / contrast).
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  type AlmanacThemeId,
  getAlmanacTheme,
  setAlmanacTheme,
  subscribeAlmanacTheme,
} from './almanac-theme'

interface AlmanacThemeContextValue {
  theme: AlmanacThemeId
  setTheme: (theme: AlmanacThemeId) => Promise<void>
}

const AlmanacThemeContext = createContext<AlmanacThemeContextValue | null>(null)

export function AlmanacThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AlmanacThemeId>('classic')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    void getAlmanacTheme().then((next) => {
      if (mounted) {
        setThemeState(next)
        setReady(true)
      }
    })
    const unsubscribe = subscribeAlmanacTheme(setThemeState)
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  const setTheme = useCallback(async (next: AlmanacThemeId) => {
    await setAlmanacTheme(next)
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  if (!ready) return null

  return <AlmanacThemeContext.Provider value={value}>{children}</AlmanacThemeContext.Provider>
}

export function useAlmanacTheme(): AlmanacThemeContextValue {
  const ctx = useContext(AlmanacThemeContext)
  if (ctx) return ctx
  return { theme: 'classic', setTheme: async () => {} }
}
