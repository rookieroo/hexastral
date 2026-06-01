'use client'

import { useTranslations } from 'next-intl'
import { type DDLPayload, DDLRedirectButton } from '@/components/DDLRedirectButton'
import type { GrowthAppStoreTarget } from '@/lib/growth/app-store-urls'

interface DownloadCTAProps {
  headline?: string
  sub?: string
  compact?: boolean
  payload?: DDLPayload
  appStoreUrl?: string
  /** Portfolio app key stored on DDL meta for attribution */
  targetApp?: GrowthAppStoreTarget
}

export function DownloadCTA({
  headline,
  sub,
  compact = false,
  payload,
  appStoreUrl,
  targetApp,
}: DownloadCTAProps) {
  const t = useTranslations('common')
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: compact ? '0.75rem' : '1.25rem',
        padding: compact ? '1.5rem' : '2rem',
        background: 'linear-gradient(135deg, rgba(196,168,98,0.08) 0%, rgba(123,94,167,0.08) 100%)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        textAlign: 'center',
      }}
    >
      {!compact && (
        <>
          <div style={{ fontSize: '1.5rem' }}>✦</div>
          {headline && (
            <h3
              style={{
                fontSize: '1.2rem',
                fontWeight: 400,
                color: 'var(--color-ivory)',
                margin: 0,
              }}
            >
              {headline}
            </h3>
          )}
          {sub && (
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--color-ivory-dim)',
                margin: 0,
                maxWidth: 300,
                lineHeight: 1.6,
              }}
            >
              {sub}
            </p>
          )}
        </>
      )}

      <DDLRedirectButton
        payload={payload}
        appStoreUrl={appStoreUrl}
        targetApp={targetApp}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.8rem 1.75rem',
          background: 'var(--color-gold)',
          color: 'var(--color-void)',
          borderRadius: 100,
          fontSize: compact ? '0.9rem' : '1rem',
          fontWeight: 500,
          letterSpacing: '0.03em',
        }}
      >
        {/* Apple icon */}
        <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
          <path d='M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z' />
        </svg>
        <span>{t('downloadButton')}</span>
      </DDLRedirectButton>

      {compact && sub && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-ivory-muted)', margin: 0 }}>{sub}</p>
      )}

      <p style={{ fontSize: '0.7rem', color: 'var(--color-ivory-muted)', margin: 0 }}>
        {t('downloadNote')}
      </p>
    </div>
  )
}
