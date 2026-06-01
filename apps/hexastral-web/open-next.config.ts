import cache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache'

const config = {
  edgeExternals: ['node:crypto', 'node:url', 'node:path', 'node:fs', 'node:stream', 'node:buffer', 'node:util'],
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
      incrementalCache: () => cache,
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
  middleware: {
    external: true,
    override: {
      wrapper: 'cloudflare-edge',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
    },
  },
}

export default config
