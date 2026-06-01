import type React from 'react'

export function GifPreloadProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
export function PreloadGifs() {
  return null
}
export const TextGif = () => <span />
