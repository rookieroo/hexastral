/**
 * Universal Links handler · matrix-wide URL dispatch.
 *
 * Why this exists (P1-15): every satellite app declares `applinks:hexastral.com`
 * in its app.json. The DDL piece is already covered by
 * `use-portfolio-bootstrap` (which extracts `?ddl=<token>` from initial URL
 * and the change listener). What's NOT covered is everything else:
 *
 *   - `https://hexastral.com/u/{username}`   → public profile share
 *   - `https://hexastral.com/r/{reportId}`   → shared reading report
 *   - any future deep-link route
 *
 * Today a friend tapping a `/u/foo` link gets dumped at the app's home
 * screen with no navigation. This module gives apps a typed `parseHexastralLink`
 * helper + a `useUniversalLinks({ onLink })` hook that fires on every URL
 * change (initial URL on cold start + subsequent `url` events).
 *
 * Dispatch is intentionally generic — the app owns navigation. The hook
 * tells you "a /u/bar link arrived"; you decide whether to push a native
 * screen, open the web URL in an in-app browser, or fall back to Safari.
 *
 * Coexists with `usePortfolioSatelliteBootstrap` — the bootstrap captures
 * DDL tokens and growth events from the same URL events. This hook is
 * purely additive: it doesn't consume the URL, just parses it for the
 * app's navigation layer.
 */

import { useEffect } from 'react'
import * as Linking from 'expo-linking'

/** Discriminated union of recognized hexastral.com link kinds. */
export type HexastralLink =
  | { kind: 'profile'; username: string }
  | { kind: 'report'; reportId: string }
  | { kind: 'invite'; ddlToken: string }
  | { kind: 'lp'; slug: string }
  | { kind: 'unknown'; url: string }

const PROFILE_PATH = /^\/u\/([^/?#]+)/
const REPORT_PATH = /^\/report\/([^/?#]+)/
const LP_PATH = /^\/lp\/([^/?#]+)/
/**
 * Locale-prefixed variants — the web routes live under `/{locale}/...` for
 * non-EN locales. Strip a leading 2-5 char locale segment before matching.
 */
const LOCALE_PREFIX = /^\/(en|zh|tw|ja|zh-Hans|zh-Hant)(?=\/)/

/**
 * Parse any hexastral.com URL (or a custom-scheme deep link like
 * `fate://...`) into a known link kind, or `unknown` if no pattern matches.
 * Pure function — no I/O, safe to call from any context.
 *
 * Returns null when `url` is null/empty — useful for `getInitialURL`
 * call sites that may resolve to null on cold start.
 */
export function parseHexastralLink(url: string | null | undefined): HexastralLink | null {
  if (!url) return null

  let parsed: Linking.ParsedURL
  try {
    parsed = Linking.parse(url)
  } catch {
    return { kind: 'unknown', url }
  }

  // ?ddl=<token> wins regardless of pathname — the marketing flow puts the
  // token on the home page during App-Store-deferred install.
  const ddlTok = parsed.queryParams?.ddl
  if (typeof ddlTok === 'string' && ddlTok.trim()) {
    return { kind: 'invite', ddlToken: ddlTok.trim() }
  }

  const rawPath = `/${(parsed.path ?? '').replace(/^\/+/, '')}`
  const path = rawPath.replace(LOCALE_PREFIX, '')

  const profile = PROFILE_PATH.exec(path)
  if (profile?.[1]) return { kind: 'profile', username: decodeURIComponent(profile[1]) }

  const report = REPORT_PATH.exec(path)
  if (report?.[1]) return { kind: 'report', reportId: decodeURIComponent(report[1]) }

  const lp = LP_PATH.exec(path)
  if (lp?.[1]) return { kind: 'lp', slug: decodeURIComponent(lp[1]) }

  return { kind: 'unknown', url }
}

interface UseUniversalLinksOptions {
  /**
   * Called for every recognized hexastral.com link. Fires on cold-start
   * initial URL AND subsequent `url` events. If `onLink` returns a
   * Promise, errors are swallowed — telemetry should be the caller's
   * concern.
   */
  onLink: (link: HexastralLink) => void | Promise<void>
  /**
   * Skip the cold-start initial URL pass. Useful when the bootstrap hook
   * has already handled it and you only want subsequent events. Default false.
   */
  skipInitial?: boolean
}

/**
 * Subscribe to inbound hexastral.com URLs and dispatch parsed links to
 * `onLink`. Self-cleans on unmount. Safe to use alongside
 * `usePortfolioSatelliteBootstrap` — both subscribe independently.
 */
export function useUniversalLinks({ onLink, skipInitial = false }: UseUniversalLinksOptions): void {
  useEffect(() => {
    let cancelled = false

    async function dispatchUrl(url: string | null): Promise<void> {
      const parsed = parseHexastralLink(url)
      if (!parsed || cancelled) return
      try {
        await onLink(parsed)
      } catch {
        // Swallow — link-dispatch errors shouldn't crash the listener.
      }
    }

    if (!skipInitial) {
      void Linking.getInitialURL().then(dispatchUrl)
    }

    const sub = Linking.addEventListener('url', ({ url }) => {
      void dispatchUrl(url)
    })

    return () => {
      cancelled = true
      sub.remove()
    }
  }, [onLink, skipInitial])
}
