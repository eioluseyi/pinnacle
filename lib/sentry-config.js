export function getSentryDsn() {
  return process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? '';
}

export function isSentryEnabled() {
  return Boolean(getSentryDsn());
}
