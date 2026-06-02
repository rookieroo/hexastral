const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')
const Module = require('node:module')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')
const localModules = path.resolve(projectRoot, 'node_modules')

// ─── Monorepo version conflicts ────────────────────────────────────
// Bun hoists most deps to root node_modules, but this app needs
// different versions than the rest of the monorepo:
//
//   Package      Local (app needs)   Root (monorepo)
//   tailwindcss  3.x    (NativeWind)  4.x    (web apps)
//
// Two-phase fix:
//   1. Config-time:  Module._resolveFilename intercept (Node-level)
//   2. Bundle-time:  Metro resolveRequest intercept

// ─── Phase 1: Config-time resolution ───────────────────────────────
// NativeWind's metro plugin calls require('tailwindcss') at config
// load time. Node's normal resolution finds root's v4 first.
const origResolveFilename = Module._resolveFilename
Module._resolveFilename = function (request, parent, ...args) {
  if (request === 'tailwindcss' || request.startsWith('tailwindcss/')) {
    try {
      const resolvedPath = require.resolve(request, { paths: [projectRoot] })
      return origResolveFilename.call(this, resolvedPath, parent, ...args)
    } catch {
      // fallback
    }
  }
  return origResolveFilename.call(this, request, parent, ...args)
}

const { withNativeWind } = require('nativewind/metro')

// ─── Metro config ──────────────────────────────────────────────────
const config = getDefaultConfig(projectRoot)

// Minimize watch folders to avoid Metro OOM on unrelated apps
config.watchFolders = [
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'packages'),
  path.resolve(workspaceRoot, 'tooling'),
]

config.resolver.nodeModulesPaths = [
  localModules,
  path.resolve(workspaceRoot, 'node_modules'),
]

// Bun isolates deps per workspace; hierarchical lookup lets Metro
// find transitive deps hoisted to root (e.g. expo-modules-core).
config.resolver.disableHierarchicalLookup = false

// ─── Phase 2: Bundle-time resolution ───────────────────────────────
// With hierarchical lookup on, Metro walks up to root node_modules
// and can pick up wrong versions. resolveRequest pins conflicting
// packages to local copies by restricting nodeModulesPaths.
//
// Packages that must resolve to a single instance across the whole bundle:
//
//   tailwindcss          local v3 vs root v4 (web apps)
//   nativewind           bun may install a separate copy into any nativewind-using workspace
//   react-native-css-interop  same — bun co-installs one per nativewind copy
//
// nativewind and react-native-css-interop each carry a global singleton
// (rootVariables Map, interopComponents Map). If two instances exist in the bundle,
// the metro plugin registers CSS vars into instance A while consumer components
// run against instance B (empty rootVariables) → CSS variables never resolve → black text.
const PINNED = ['tailwindcss', 'nativewind', 'react-native-css-interop']

// Map pinned packages to their correctly resolved directories
const PINNED_MODULES = Object.fromEntries(
  PINNED.map((p) => {
    try {
      const packageJsonPath = require.resolve(`${p}/package.json`, { paths: [projectRoot] })
      return [p, path.dirname(packageJsonPath)]
    } catch {
      return [p, null]
    }
  })
)

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const match = PINNED.find((p) => moduleName === p || moduleName.startsWith(`${p}/`))
  if (match && PINNED_MODULES[match]) {
    // Rewrite the module name to use the absolute path of the pinned module
    const absolutePath = path.join(PINNED_MODULES[match], moduleName.slice(match.length))
    return context.resolveRequest(
      { ...context, resolveRequest: undefined },
      absolutePath,
      platform,
    )
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 })
