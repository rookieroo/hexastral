import Constants, { ExecutionEnvironment } from 'expo-constants'

/**
 * True when running inside the official Expo Go client (StoreClient).
 * Used to gate dynamic require() of Expo-Go-incompatible native modules:
 * @sentry/react-native, react-native-purchases, @shopify/react-native-skia
 *
 * In dev-client builds and production this is always false.
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient
