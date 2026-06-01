'use client'
import * as React from 'react'

export type DesignTheme = 'default' | 'modern' | 'classic'

const DesignThemeContext = React.createContext<DesignTheme>('default')

export function DesignThemeProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: DesignTheme
}) {
  return <DesignThemeContext.Provider value={value}>{children}</DesignThemeContext.Provider>
}

export function useDesignTheme() {
  return React.useContext(DesignThemeContext)
}
