import { config } from './config'

export type DreamPortfolioPreview = {
  readingId: string
  output: {
    interpretation?: string
  }
}

/** Portfolio preview for dreamoracle — iOS client skips Turnstile (see hexastral-api middleware). */
export async function runDreamPortfolioPreview(dreamText: string, locale: string): Promise<DreamPortfolioPreview> {
  const url = `${config.apiUrl.replace(/\/+$/, '')}/api/portfolio/preview/dreamoracle`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-platform': 'ios',
    },
    body: JSON.stringify({ input: { dreamText }, locale }),
  })
  if (!res.ok) {
    throw new Error(`Dream preview failed: ${res.status}`)
  }
  const json = (await res.json()) as {
    readingId?: string
    output?: { interpretation?: string }
  }
  if (typeof json.readingId !== 'string') {
    throw new Error('Dream preview: missing readingId')
  }
  return {
    readingId: json.readingId,
    output: typeof json.output === 'object' && json.output !== null ? json.output : {},
  }
}
