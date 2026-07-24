import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { resolveBrandRootRedirect } from './lib/brand-host'
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

const CLICK_ID_KEYS = ['fbclid', 'gclid', 'ttclid', 'rdt_cid', '_fbp', '_fbc'] as const

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

/** Mirror of lib/ads/surface.ts — kept inline so middleware has no app-import graph issues. */
function trafficSurfaceForPath(pathname: string): string {
  const path = pathname.replace(/^\/(zh|tw|ja)(?=\/)/, '') || '/'
  if (path.startsWith('/privacy') || path.startsWith('/terms')) return 'legal'
  if (path.startsWith('/resonate')) return 'resonate'
  if (path.startsWith('/lp/hexagram')) return 'lp_reopen'
  if (
    /^\/lp\/(yuel|yuun|kanyu|compatibility|face|dream|personality|twelve-palaces)(\/|$)/.test(path)
  ) {
    return 'lp_acq'
  }
  if (path.startsWith('/lp/')) return 'lp_reopen'
  return 'other'
}

function mergeJsonCookie(
  req: NextRequest,
  res: NextResponse,
  cookieName: string,
  keys: readonly string[]
) {
  const incoming: Record<string, string> = {}
  for (const k of keys) {
    const v = req.nextUrl.searchParams.get(k)
    if (v) incoming[k] = v
  }
  if (Object.keys(incoming).length === 0) return
  let merged: Record<string, string> = incoming
  const prev = req.cookies.get(cookieName)?.value
  if (prev) {
    try {
      const parsed = JSON.parse(prev) as Record<string, string>
      if (parsed && typeof parsed === 'object') merged = { ...parsed, ...incoming }
    } catch {
      merged = incoming
    }
  }
  res.cookies.set(cookieName, JSON.stringify(merged), {
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  })
}

function persistAttributionParams(req: NextRequest, res: NextResponse) {
  mergeJsonCookie(req, res, 'growth_utm', UTM_KEYS)
  mergeJsonCookie(req, res, 'growth_click_ids', CLICK_ID_KEYS)
}

/** Propagate surface to RSC via request headers; keep cookies on the response. */
function finalize(req: NextRequest, res: NextResponse): NextResponse {
  const surface = trafficSurfaceForPath(req.nextUrl.pathname)
  res.headers.set('x-traffic-surface', surface)
  persistAttributionParams(req, res)
  return res
}

function withSurfaceRequest(request: NextRequest): NextRequest {
  const headers = new Headers(request.headers)
  headers.set('x-traffic-surface', trafficSurfaceForPath(request.nextUrl.pathname))
  return new NextRequest(request.url, { headers })
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const surfaced = withSurfaceRequest(request)

  // ─── Brand default locale: Yuel / Yuun / Yaul / Kanyu ───────────────────────
  if (pathname === '/') {
    const host = request.headers.get('host') ?? ''
    const redirectPath = resolveBrandRootRedirect({
      host,
      localeCookie: request.cookies.get('NEXT_LOCALE')?.value ?? null,
      acceptLanguage: request.headers.get('accept-language'),
    })
    if (redirectPath) {
      const url = request.nextUrl.clone()
      url.pathname = redirectPath
      return NextResponse.redirect(url)
    }
  }

  // ─── A/B Test: Onboarding 变体分流 ────────────────────────────
  if (pathname.match(/^\/[a-z-]+\/onboarding\/?$/)) {
    let variant = request.cookies.get('ab_onboarding')?.value
    if (!variant) {
      variant = Math.random() < 0.5 ? 'A' : 'B'
    }

    const response = intlMiddleware(surfaced)
    response.cookies.set('ab_onboarding', variant, {
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    })

    if (variant === 'B') {
      const url = request.nextUrl.clone()
      url.pathname = pathname.replace('/onboarding', '/onboarding-b')
      const rewritten = NextResponse.rewrite(url, {
        request: { headers: surfaced.headers },
      })
      rewritten.cookies.set('ab_onboarding', variant, {
        maxAge: COOKIE_MAX_AGE,
        path: '/',
        sameSite: 'lax',
      })
      return finalize(request, rewritten)
    }

    return finalize(request, response)
  }

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
    const res = NextResponse.next({
      request: { headers: surfaced.headers },
    })
    if (pathname.startsWith('/u/')) {
      res.headers.set('Cache-Control', 'private, no-store, max-age=0')
    }
    return finalize(request, res)
  }

  const intlRes = intlMiddleware(surfaced)
  return finalize(request, intlRes)
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}
