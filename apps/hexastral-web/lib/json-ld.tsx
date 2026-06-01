/** Renders a JSON-LD script for search / AI crawlers. Safe for RSC. */
export function JsonLd(json: Record<string, unknown>) {
  return (
    <script
      type='application/ld+json'
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  )
}
