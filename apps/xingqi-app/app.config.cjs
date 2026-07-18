/** See `coin-cast-app/app.config.cjs` for role of this file. */
const { registerExpoEnv } = require('@zhop/expo-env-loader')

registerExpoEnv(__dirname)

module.exports = require('./app.json').expo
