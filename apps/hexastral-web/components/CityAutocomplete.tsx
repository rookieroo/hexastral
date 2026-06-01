'use client'

import { useLocale } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type GeocodedCity, searchCities } from '@/lib/geocode'

export interface CitySelection {
  name: string
  latitude: number
  longitude: number
  timezone: string | null
}

interface CityAutocompleteProps {
  value: string
  onChange: (city: string, geo?: CitySelection) => void
  placeholder?: string
  style?: React.CSSProperties
}

export function CityAutocomplete({ value, onChange, placeholder, style }: CityAutocompleteProps) {
  const locale = useLocale()
  const [suggestions, setSuggestions] = useState<GeocodedCity[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searching, setSearching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleInput = useCallback(
    (text: string) => {
      onChange(text)

      if (timerRef.current) clearTimeout(timerRef.current)

      if (text.trim().length < 2) {
        setSuggestions([])
        setShowDropdown(false)
        return
      }

      setSearching(true)
      timerRef.current = setTimeout(async () => {
        const results = await searchCities(text.trim(), locale, 7)
        setSuggestions(results)
        setShowDropdown(results.length > 0)
        setSearching(false)
      }, 300)
    },
    [onChange, locale]
  )

  const handleSelect = useCallback(
    (city: GeocodedCity) => {
      onChange(city.name, {
        name: city.name,
        latitude: city.lat,
        longitude: city.lon,
        timezone: city.timezone,
      })
      setShowDropdown(false)
      setSuggestions([])
    },
    [onChange]
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type='text'
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setShowDropdown(true)
        }}
        placeholder={placeholder}
        maxLength={60}
        autoComplete='off'
        style={style}
      />
      {searching && (
        <span
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '0.75rem',
            color: 'var(--color-ivory-muted)',
          }}
        >
          ...
        </span>
      )}
      {showDropdown && suggestions.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            listStyle: 'none',
            margin: '4px 0 0',
            padding: 0,
            background: 'rgba(10, 10, 26, 0.95)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            maxHeight: 240,
            overflowY: 'auto',
            backdropFilter: 'blur(12px)',
          }}
        >
          {suggestions.map((city, i) => (
            <li
              key={`${city.name}-${city.countryCode}-${i}`}
              onMouseDown={() => handleSelect(city)}
              style={{
                padding: '0.6rem 1rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
                color: 'var(--color-ivory)',
                borderBottom:
                  i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(196,168,98,0.1)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <span>{city.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-ivory-muted)' }}>
                {city.country}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
