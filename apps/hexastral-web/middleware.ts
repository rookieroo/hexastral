import { type NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
] as const

function persistUtmParams(req: NextRequest, res: NextResponse) {
  const incoming: Record<string, string> = {}
  for (const k of UTM_KEYS) {
    const v = req.nextUrl.searchParams.get(k)
    if (v) incoming[k] = v
  }
  if (Object.keys(incoming).length === 0) return
  let merged: Record<string, string> = incoming
  const prev = req.cookies.get('growth_utm')?.value
  if (prev) {
    try {
      const parsed = JSON.parse(prev) as Record<string, string>
      if (parsed && typeof parsed === 'object') merged = { ...parsed, ...incoming }
    } catch {
      merged = incoming
    }
  }
  res.cookies.set('growth_utm', JSON.stringify(merged), {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
  })
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─── Brand default locale: Yuel / Yuun open in 简体中文 ──────────────────────
  // `localePrefix: 'as-needed'` resolves the bare URL to the global default locale
  // (en). The Chinese-first brand hosts (yuel.* / yuun.*) should open in Chinese, so
  // redirect their root to /zh. It must be a redirect, not a rewrite: the page reads
  // its locale via next-intl's `getLocale()`, which only resolves to zh when the
  // request actually flows through the intl pipeline as /zh. hexastral.com keeps its
  // en default; /zh is non-looping (it no longer matches `=== '/'`).
  if (pathname === '/') {
    const host = request.headers.get('host') ?? ''
    if (host.startsWith('yuel.') || host.startsWith('yuun.')) {
      const url = request.nextUrl.clone()
      url.pathname = '/zh'
      return NextResponse.redirect(url)
    }
  }

  // ─── A/B Test: Onboarding 变体分流 ────────────────────────────
  // Cookie 'ab_onboarding' 持久化 30 天，同一用户始终看到同一变体。
  // 流量 A → /[locale]/onboarding (现有短表单)
  // 流量 B → /[locale]/onboarding-b (沉浸式问答，需新建页面)
  if (pathname.match(/^\/[a-z-]+\/onboarding\/?$/)) {
    let variant = request.cookies.get('ab_onboarding')?.value
    if (!variant) {
      variant = Math.random() < 0.5 ? 'A' : 'B'
    }

    // 先跑 intl middleware 处理 locale
    const response = intlMiddleware(request)
    response.cookies.set('ab_onboarding', variant, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
    })

    // 流量 B → rewrite 到 /onboarding-b（如果该页面存在的话）
    if (variant === 'B') {
      const url = request.nextUrl.clone()
      url.pathname = pathname.replace('/onboarding', '/onboarding-b')
      const rewritten = NextResponse.rewrite(url)
      rewritten.cookies.set('ab_onboarding', variant, {
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        sameSite: 'lax',
      })
      persistUtmParams(request, rewritten)
      return rewritten
    }

    persistUtmParams(request, response)
    return response
  }

  // Exclude non-localized routes from intl
  if (
    pathname.startsWith('/.well-known/') ||
    pathname.startsWith('/u/') ||
    pathname.startsWith('/hehun/') ||
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/resonate/') ||
    pathname.startsWith('/report/') ||
    pathname.startsWith('/s/') ||
    pathname.startsWith('/auspice')
  ) {
    const res = NextResponse.next()
    // `/u/*` — App Router pages use `dynamic = 'force-dynamic'` + `fetch(..., no-store)`;
    // API `by-username` returns `Cache-Control: no-store`. Still set here so HTML shells
    // are not edge-cached if a rule misroutes.
    //
    // Ops checklist (prod): confirm Cloudflare does NOT cache `/u/*` (Bypass or Cache Level
    // DYNAMIC / equivalent). Quick probe:
    //   curl -sI "https://hexastral.com/u/<username>" | rg -i 'cache-control|cf-cache-status'
    // Expect `Cache-Control: private, no-store` (or stronger) and ideally `cf-cache-status: DYNAMIC|BYPASS`.
    if (pathname.startsWith('/u/')) {
      res.headers.set('Cache-Control', 'private, no-store, max-age=0')
    }
    persistUtmParams(request, res)
    return res
  }

  const intlRes = intlMiddleware(request)
  persistUtmParams(request, intlRes)
  return intlRes
}

export const config = {
  // Match all paths except Next.js internals, static files, and API routes
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}
