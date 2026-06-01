/**
 * Cloudflare Workers ships `.wasm` imports as `WebAssembly.Module`.
 * The actual binding lives in wrangler's bundler — at type level we need
 * this declaration to satisfy strict TypeScript.
 */

declare module '*.wasm' {
  const module: WebAssembly.Module
  export default module
}
