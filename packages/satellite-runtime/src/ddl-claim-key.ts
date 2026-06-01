export function ddlClaimedKey(storagePrefix: string): string {
  return `${storagePrefix}:ddl_claimed`
}

export function pendingDdlTokenKey(storagePrefix: string): string {
  return `${storagePrefix}:pending_ddl_token`
}
