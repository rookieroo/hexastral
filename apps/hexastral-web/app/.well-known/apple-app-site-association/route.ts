import { NextResponse } from 'next/server'

/** Apple Team ID — must match Developer Portal & App Store Connect. */
const TEAM_ID = 'L9Z47DW56X'

/**
 * Universal Links — one entry per app. Bundle IDs match Phase J · ADR-0007
 * refocus (hexastral-app = personal-fate flagship; satellites are single-purpose).
 *
 * Path prefixes are non-overlapping so iOS routes each link to exactly one app.
 * The `/*\/...` variants accept locale-prefixed routes (e.g. /zh/lp/face/...).
 *
 * @see https://developer.apple.com/documentation/xcode/supporting-associated-domains
 */
export function GET(): NextResponse {
  const body = {
    applinks: {
      apps: [],
      details: [
        // Flagship — personal-fate (natal / stellar / report)
        {
          appID: `${TEAM_ID}.com.hexastral.fate`,
          paths: [
            '/lp/fate/*',
            '/*/lp/fate/*',
            '/lp/natal/*',
            '/*/lp/natal/*',
            '/lp/stellar/*',
            '/*/lp/stellar/*',
            '/lp/horoscope/*',
            '/*/lp/horoscope/*',
          ],
        },
        // Yuel — synastry / bonds
        {
          appID: `${TEAM_ID}.com.hexastral.yuel`,
          paths: [
            '/lp/yuel/*',
            '/*/lp/yuel/*',
            '/lp/yuan/*',
            '/*/lp/yuan/*',
            '/lp/synastry/*',
            '/*/lp/synastry/*',
            '/lp/compatibility/*',
            '/*/lp/compatibility/*',
          ],
        },
        // Yuun — almanac
        {
          appID: `${TEAM_ID}.com.hexastral.yuun`,
          paths: ['/lp/yuun/*', '/*/lp/yuun/*'],
        },
        // Syel — face / palm AI reading (API target still faceoracle)
        {
          appID: `${TEAM_ID}.com.hexastral.syel`,
          paths: ['/lp/face/*', '/*/lp/face/*', '/lp/palm/*', '/*/lp/palm/*'],
        },
        // Dream interpretation
        {
          appID: `${TEAM_ID}.com.hexastral.dreamoracle`,
          paths: ['/lp/dream/*', '/*/lp/dream/*'],
        },
        // Yaul — I-Ching / hexagram cast
        {
          appID: `${TEAM_ID}.com.hexastral.yaul`,
          paths: [
            '/lp/yiching/*',
            '/*/lp/yiching/*',
            '/lp/hexagram/*',
            '/*/lp/hexagram/*',
            '/tools/hexagram/*',
            '/*/tools/hexagram/*',
          ],
        },
        // Numerology + plum-blossom
        {
          appID: `${TEAM_ID}.com.hexastral.numerology`,
          paths: ['/lp/numerology/*', '/*/lp/numerology/*', '/lp/meihua/*', '/*/lp/meihua/*'],
        },
        // Kanyu — feng-shui report
        {
          appID: `${TEAM_ID}.com.hexastral.kanyu`,
          paths: [
            '/lp/kanyu/*',
            '/*/lp/kanyu/*',
            '/lp/feng/*',
            '/*/lp/feng/*',
            '/feng-shui/*',
            '/*/feng-shui/*',
          ],
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
