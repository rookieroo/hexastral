'use client'

import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  size: number
  duration: number
  delay: number
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.5 + 0.3,
    duration: Math.random() * 4 + 2,
    delay: Math.random() * 5,
  }))
}

export function StarBackground({ density = 120 }: { density?: number }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const stars = generateStars(density)
    const fragment = document.createDocumentFragment()

    for (const star of stars) {
      const el = document.createElement('span')
      el.style.cssText = `
        position: absolute;
        left: ${star.x}%;
        top: ${star.y}%;
        width: ${star.size}px;
        height: ${star.size}px;
        background: white;
        border-radius: 50%;
        animation: twinkle ${star.duration}s ease-in-out infinite;
        animation-delay: ${star.delay}s;
        pointer-events: none;
      `
      fragment.appendChild(el)
    }

    container.appendChild(fragment)
    return () => {
      container.innerHTML = ''
    }
  }, [density])

  return (
    <div
      ref={containerRef}
      aria-hidden='true'
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background:
          'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(123,94,167,0.12) 0%, transparent 70%)',
      }}
    />
  )
}
