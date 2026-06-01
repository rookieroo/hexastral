/** Read-only four pillars — data shape matches persisted `user_charts` natal JSON. */

interface PillarCell {
  stem: string
  branch: string
  nayin?: string
}

export interface PublicNatalPillarsProps {
  pillars: {
    year: PillarCell
    month: PillarCell
    day: PillarCell
    hour: PillarCell
  }
}

function isPillarCell(v: unknown): v is PillarCell {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return typeof o.stem === 'string' && typeof o.branch === 'string'
}

export function parsePublicNatalPillars(natal: unknown): PublicNatalPillarsProps['pillars'] | null {
  if (!natal || typeof natal !== 'object') return null
  const p = (natal as Record<string, unknown>).pillars
  if (!p || typeof p !== 'object') return null
  const pr = p as Record<string, unknown>
  if (
    !isPillarCell(pr.year) ||
    !isPillarCell(pr.month) ||
    !isPillarCell(pr.day) ||
    !isPillarCell(pr.hour)
  ) {
    return null
  }
  return {
    year: pr.year,
    month: pr.month,
    day: pr.day,
    hour: pr.hour,
  }
}

const ORDER = ['year', 'month', 'day', 'hour'] as const

const LABEL: Record<(typeof ORDER)[number], string> = {
  hour: '时',
  day: '日',
  month: '月',
  year: '年',
}

export function PublicNatalPillars({ pillars }: PublicNatalPillarsProps) {
  return (
    <div
      style={{
        padding: '1.25rem',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
      }}
    >
      <p
        style={{
          fontSize: '0.68rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'var(--color-gold)',
          margin: '0 0 1rem',
          textAlign: 'center',
        }}
      >
        Ba Zi · Four pillars
      </p>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        {ORDER.map((key) => {
          const cell = pillars[key]
          return (
            <div key={key} style={{ flex: 1, textAlign: 'center' }}>
              <p
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--color-ivory-dim)',
                  margin: '0 0 0.5rem',
                }}
              >
                {LABEL[key]}
              </p>
              <p
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 500,
                  color: 'var(--color-gold)',
                  margin: '0 0 0.15rem',
                }}
              >
                {cell.stem}
              </p>
              <p
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 500,
                  color: 'var(--color-ivory)',
                  margin: '0 0 0.25rem',
                }}
              >
                {cell.branch}
              </p>
              {cell.nayin ? (
                <p style={{ fontSize: '0.65rem', color: 'var(--color-ivory-muted)', margin: 0 }}>
                  {cell.nayin}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
