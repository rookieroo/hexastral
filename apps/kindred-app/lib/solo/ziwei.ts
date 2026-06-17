/**
 * Client-side 紫微斗数 命盘 compute — re-exported from the shared @zhop/scenario-yuan
 * package (Phase 0b of the Yuel/Yuun split). The package self-polyfills Intl
 * (intl-pluralrules) for iztro, so this thin shim keeps every `@/lib/solo/ziwei`
 * consumer untouched.
 */
export * from '@zhop/scenario-yuan/ziwei'
