import type { Instrumentation } from 'next'

// Next.js calls this for every server error nobody caught: a page that
// failed to render, a route handler or server action that threw. It is
// logged as one JSON line and, when ALERT_EMAIL is set, emailed (see
// src/lib/monitoring.ts).
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { redactPath, reportError } = await import('@/lib/monitoring')
  const digest = typeof err === 'object' && err !== null && 'digest' in err ? String(err.digest) : undefined
  await reportError(`${context.routeType} ${context.routePath}`, err, {
    method: request.method,
    path: redactPath(request.path),
    ...(digest ? { digest } : {}),
  })
}
