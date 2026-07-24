import { NextResponse } from 'next/server'

/**
 * Android App Links — populate with package names + SHA-256 cert fingerprints when Play Console signing is stable.
 * Empty array is valid JSON and keeps the route reserved for future Digital Asset Links.
 */
export function GET(): NextResponse {
  const placeholders = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.hexastral.yaul',
        sha256_cert_fingerprints: ['REPLACE_WITH_PLAY_SHA256_FINGERPRINT'],
      },
    },
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.hexastral.dreamoracle',
        sha256_cert_fingerprints: ['REPLACE_WITH_PLAY_SHA256_FINGERPRINT'],
      },
    },
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.hexastral.eightpillars',
        sha256_cert_fingerprints: ['REPLACE_WITH_PLAY_SHA256_FINGERPRINT'],
      },
    },
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.hexastral.syel',
        sha256_cert_fingerprints: ['REPLACE_WITH_PLAY_SHA256_FINGERPRINT'],
      },
    },
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.hexastral.soulmatch',
        sha256_cert_fingerprints: ['REPLACE_WITH_PLAY_SHA256_FINGERPRINT'],
      },
    },
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.hexastral.starpalace',
        sha256_cert_fingerprints: ['REPLACE_WITH_PLAY_SHA256_FINGERPRINT'],
      },
    },
  ]
  return NextResponse.json(placeholders, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
