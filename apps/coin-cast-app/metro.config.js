const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)
config.watchFolders = [
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'packages'),
]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
config.resolver.disableHierarchicalLookup = false

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-native-reanimated': path.resolve(projectRoot, 'node_modules/react-native-reanimated'),
}

const expoRouterRoot = path.dirname(
  require.resolve('expo-router/package.json', { paths: [projectRoot] }),
)
// three@0.184+ does not export ./package.json; main resolves to build/three.cjs
const threeRoot = path.dirname(
  path.dirname(require.resolve('three', { paths: [projectRoot] })),
)

const PINNED = ['expo-router', 'react', 'react-native', 'react-native-reanimated', 'three']

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const match = PINNED.find((p) => moduleName === p || moduleName.startsWith(`${p}/`))
  if (match) {
    const root =
      match === 'expo-router'
        ? expoRouterRoot
        : match === 'three'
          ? threeRoot
          : path.dirname(require.resolve(`${match}/package.json`, { paths: [projectRoot] }))
    const subpath = moduleName === match ? '' : moduleName.slice(match.length)
    const absolutePath = path.join(root, subpath)
    return context.resolveRequest({ ...context, resolveRequest: undefined }, absolutePath, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
