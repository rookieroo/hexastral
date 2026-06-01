/**
 * Same pattern as portfolio apps — see `coin-cast-app/app.config.cjs` header.
 */
const { registerExpoEnv } = require('@zhop/expo-env-loader')

registerExpoEnv(__dirname)

module.exports = require('./app.json').expo
