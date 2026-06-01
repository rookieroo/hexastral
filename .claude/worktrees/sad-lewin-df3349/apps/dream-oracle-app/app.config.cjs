/**
 * See `coin-cast-app/app.config.cjs` header for why `.cjs` + `registerExpoEnv`.
 */
const { registerExpoEnv } = require('@zhop/expo-env-loader')

registerExpoEnv(__dirname)

module.exports = require('./app.json').expo
