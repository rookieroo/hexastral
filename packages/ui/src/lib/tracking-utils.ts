export function trackEvent(name: string, data?: any) {
  console.log('Track:', name, data)
}

export function parseTrackingParams(searchParams: URLSearchParams) {
  const destinationUrl = searchParams.get('dest') || searchParams.get('url') || '/'

  const platforms = (searchParams.get('platforms') || '').split(',').map((p) => p.trim())

  const tracking = {
    source: searchParams.get('source') || searchParams.get('utm_source'),
    medium: searchParams.get('medium') || searchParams.get('utm_medium'),
    campaign: searchParams.get('campaign') || searchParams.get('utm_campaign'),
    term: searchParams.get('term') || searchParams.get('utm_term'),
    content: searchParams.get('content') || searchParams.get('utm_content') || undefined,
    eventType: searchParams.get('event') || undefined,
    customEventName: searchParams.get('custom_event') || undefined,
    value: searchParams.get('value') ? Number.parseFloat(searchParams.get('value')!) : undefined,
    currency: searchParams.get('currency') || 'USD',
    contentType: searchParams.get('content_type') || undefined,
    contentIds: searchParams.get('content_ids')
      ? searchParams.get('content_ids')?.split(',')
      : undefined,
    destinations: {
      meta: platforms.includes('meta'),
      tiktok: platforms.includes('tiktok'),
      google: platforms.includes('google') || platforms.includes('ga4'),
      ga4: platforms.includes('google') || platforms.includes('ga4'),
      pinterest: platforms.includes('pinterest'),
      linkedin: platforms.includes('linkedin'),
      twitter: platforms.includes('twitter') || platforms.includes('x'),
      klaviyo: platforms.includes('klaviyo'),
      bing: platforms.includes('bing'),
    },
  }

  const context = {
    source: destinationUrl,
  }

  return { destinationUrl, tracking, context }
}
