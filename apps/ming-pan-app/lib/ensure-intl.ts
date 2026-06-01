/**
 * Hermes lacks Intl.PluralRules; iztro's i18next logs a loud ERROR without this.
 * Import once from root layout before any `iztro` require.
 * (intl-pluralrules v2 ships only `polyfill` — no locale-data subpaths.)
 */
import 'intl-pluralrules/polyfill'
