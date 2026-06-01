import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'index.ts',
    templates: 'templates/index.tsx',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    '@react-email/components',
    'resend',
    'react',
  ],
  splitting: false,
  treeshake: true,
})
