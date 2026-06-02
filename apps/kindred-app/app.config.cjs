/**
 * Expo reads `app.config.*` before Metro so `EXPO_PUBLIC_*` can be injected from env files.
 * `.cjs` = CommonJS: Node runs this file directly; `require()` + `registerExpoEnv` work without
 * compiling TS or relying on `"type": "module"` in package.json.
 */
const { registerExpoEnv } = require('@zhop/expo-env-loader')

registerExpoEnv(__dirname)

module.exports = require('./app.json').expo
