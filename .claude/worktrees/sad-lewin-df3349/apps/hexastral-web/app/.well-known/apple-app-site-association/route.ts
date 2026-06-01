import { NextResponse } from 'next/server'

/** Apple Team ID — must match Developer Portal & App Store Connect. */
const TEAM_ID = 'L9Z47DW56X'

/**
 * Universal Links — one entry per satellite app with non-overlapping path prefixes.
 * @see https://developer.apple.com/documentation/xcode/supporting-associated-domains
 */
export function GET(): NextResponse {
  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID: `${TEAM_ID}.com.hexastral.faceoracle`,
          paths: ['/lp/face/*', '/*/lp/face/*'],
        },
        {
          appID: `${TEAM_ID}.com.hexastral.starpalace`,
          paths: ['/lp/horoscope/*', '/*/lp/horoscope/*'],
        },
        {
          appID: `${TEAM_ID}.com.hexastral.soulmatch`,
          paths: ['/lp/compatibility/*', '/*/lp/compatibility/*'],
        },
        {
          appID: `${TEAM_ID}.com.hexastral.fengshui`,
          paths: ['/feng-shui/*', '/*/feng-shui/*'],
        },
        {
          appID: `${TEAM_ID}.com.hexastral.dreamoracle`,
          paths: ['/lp/dream/*', '/*/lp/dream/*'],
        },
        {
          appID: `${TEAM_ID}.com.hexastral.eightpillars`,
          paths: ['/lp/personality/*', '/*/lp/personality/*'],
        },
        {
          appID: `${TEAM_ID}.com.hexastral.coincast`,
          paths: ['/lp/horoscope/*', '/*/lp/horoscope/*', '/tools/hexagram/*', '/*/tools/hexagram/*'],
        },
      ],
    },
  }

  return NextResponse.json(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
