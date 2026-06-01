export interface TrackingContext {
  [key: string]: any
}

export function buildTrackingLink(url: string, context?: TrackingContext): string {
  // TODO: Implement actual tracking parameter appending
  return url
}
