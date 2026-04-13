type ErrorContext = Record<string, unknown>;

export function logDashboardError(error: unknown, context?: ErrorContext) {
  const payload = {
    error:
      error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : { message: String(error) },
    context,
    ts: new Date().toISOString(),
  };

  console.error('[dashboard-error]', payload);

  if (typeof window !== 'undefined') {
    const maybeSentry = (window as unknown as { Sentry?: { captureException: (e: unknown, ctx?: unknown) => void } }).Sentry;
    maybeSentry?.captureException?.(error, { extra: context });
  }
}
