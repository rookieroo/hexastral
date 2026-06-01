'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

const GANZHI_SYMBOLS = [
  '甲',
  '乙',
  '丙',
  '丁',
  '戊',
  '己',
  '庚',
  '辛',
  '壬',
  '癸',
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
  '☽',
  '☿',
  '♀',
  '♂',
  '♃',
  '♄',
  '⊕',
  '✦',
  '⋆',
  '✧',
]

interface LoadingCeremonyProps {
  onComplete: () => void
  duration?: number // ms, default 4000
}

export function LoadingCeremony({ onComplete, duration = 4000 }: LoadingCeremonyProps) {
  const t = useTranslations('loading')
  const LOADING_MESSAGES = t.raw('messages') as string[]

  const [messageIndex, setMessageIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [symbols, setSymbols] = useState<string[]>([])
  const [displayedText, setDisplayedText] = useState('')

  // 进度条
  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min((elapsed / duration) * 100, 100)
      setProgress(pct)
      if (pct >= 100) {
        clearInterval(interval)
        setTimeout(onComplete, 300)
      }
    }, 50)
    return () => clearInterval(interval)
  }, [duration, onComplete])

  // 消息循环
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length)
    }, 1200)
    return () => clearInterval(interval)
  }, [])

  // 打字机效果
  useEffect(() => {
    const msg = LOADING_MESSAGES[messageIndex] ?? ''
    setDisplayedText('')
    let i = 0
    const interval = setInterval(() => {
      setDisplayedText(msg.slice(0, i + 1))
      i++
      if (i >= msg.length) clearInterval(interval)
    }, 40)
    return () => clearInterval(interval)
  }, [messageIndex])

  // 浮动干支符号
  useEffect(() => {
    const interval = setInterval(() => {
      setSymbols(
        Array.from({ length: 12 }, () => ({
          char: GANZHI_SYMBOLS[Math.floor(Math.random() * GANZHI_SYMBOLS.length)] ?? '✦',
          x: Math.random() * 100,
          y: Math.random() * 100,
        })).map((s) => `${s.char}|${s.x.toFixed(1)}|${s.y.toFixed(1)}`)
      )
    }, 800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-void)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '2rem',
      }}
    >
      {/* 浮动干支符号背景 */}
      <div aria-hidden='true' style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {symbols.map((s, i) => {
          const [char, x, y] = s.split('|')
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                color: 'rgba(196,168,98,0.15)',
                fontSize: `${Math.random() * 1.5 + 0.8}rem`,
                fontWeight: 300,
                transition: 'all 0.8s ease',
                userSelect: 'none',
              }}
            >
              {char}
            </span>
          )
        })}
      </div>

      {/* 旋转罗盘环 */}
      <div style={{ position: 'relative', width: 160, height: 160, marginBottom: '3rem' }}>
        {/* 外环 */}
        <div
          aria-hidden='true'
          style={{
            position: 'absolute',
            inset: 0,
            border: '1px solid rgba(196,168,98,0.3)',
            borderRadius: '50%',
            animation: 'spin-slow 20s linear infinite',
          }}
        />
        {/* 内环（反向） */}
        <div
          aria-hidden='true'
          style={{
            position: 'absolute',
            inset: 20,
            border: '1px solid rgba(196,168,98,0.15)',
            borderTopColor: 'var(--color-gold)',
            borderRadius: '50%',
            animation: 'spin-slow 12s linear infinite reverse',
          }}
        />
        {/* 中心脉冲点 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              background: 'var(--color-gold)',
              borderRadius: '50%',
              animation: 'pulse-gold 1.5s ease-in-out infinite',
            }}
          />
        </div>
        {/* 经纬坐标 */}
        <div
          style={{
            position: 'absolute',
            bottom: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'var(--color-gold-dim)',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap',
          }}
        >
          {new Date().toISOString().split('T')[0]}
        </div>
      </div>

      {/* 打字机消息 */}
      <div
        style={{
          height: '1.5rem',
          color: 'var(--color-ivory-dim)',
          fontSize: '0.85rem',
          fontFamily: 'monospace',
          letterSpacing: '0.05em',
          textAlign: 'center',
          minWidth: '20ch',
        }}
      >
        {displayedText}
        <span style={{ animation: 'blink 1s step-end infinite', marginLeft: 2 }}>|</span>
      </div>

      {/* 进度条 */}
      <div
        style={{
          marginTop: '2rem',
          width: 200,
          height: 1,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--color-purple), var(--color-gold))',
            transition: 'width 0.1s linear',
          }}
        />
      </div>
    </div>
  )
}
