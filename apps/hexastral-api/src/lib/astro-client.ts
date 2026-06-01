/**
 * svc-astro 客户端 — 通过 Service Binding 调用核心算力引擎
 */

/** Default timeout for svc-astro calls (55 seconds — Pro tier runs up to 4 LLM fallbacks serially) */
const ASTRO_TIMEOUT_MS = 55_000

type FetcherLike = { fetch(input: RequestInfo, init?: RequestInit): Promise<Response> }

/**
 * 调用 svc-astro 内部端点
 * @param svcAstro - Service Binding Fetcher
 * @param path - 请求路径 (如 /stellar/chart)
 * @param body - 请求体 JSON
 */
export async function callAstro<T = unknown>(
  svcAstro: FetcherLike,
  path: string,
  body: unknown
): Promise<T> {
  const res = await svcAstro.fetch(
    new Request(`https://svc-astro.internal${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(ASTRO_TIMEOUT_MS),
    })
  )

  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error')
    throw new Error(`svc-astro ${path} failed (${res.status}): ${err}`)
  }

  return res.json() as Promise<T>
}

/**
 * 调用 svc-astro GET 端点
 */
export async function callAstroGet<T = unknown>(svcAstro: FetcherLike, path: string): Promise<T> {
  const res = await svcAstro.fetch(
    new Request(`https://svc-astro.internal${path}`, {
      signal: AbortSignal.timeout(ASTRO_TIMEOUT_MS),
    })
  )

  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error')
    throw new Error(`svc-astro ${path} failed (${res.status}): ${err}`)
  }

  return res.json() as Promise<T>
}
