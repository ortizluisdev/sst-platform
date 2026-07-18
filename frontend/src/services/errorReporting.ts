import type { App } from 'vue'

interface ErrorReport {
  message: string
  stack?: string
  source: 'vue' | 'window' | 'unhandledrejection'
  url: string
  userAgent: string
  timestamp: string
}

const endpoint = import.meta.env.VITE_ERROR_REPORTING_ENDPOINT as string | undefined

function report(payload: ErrorReport) {
  // Always visible locally — this is the only channel until VITE_ERROR_REPORTING_ENDPOINT
  // points at a real collector (Sentry, a custom endpoint, etc.).
  console.error(`[${payload.source}]`, payload.message, payload.stack ?? '')

  if (!endpoint) return
  try {
    const body = JSON.stringify(payload)
    // sendBeacon survives page unload (e.g. errors during navigation); fetch is the fallback.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, body)
    } else {
      fetch(endpoint, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(
        () => {},
      )
    }
  } catch {
    // Reporting must never itself throw or recurse into the error handlers below.
  }
}

function toReport(error: unknown, source: ErrorReport['source']): ErrorReport {
  return {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    source,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  }
}

/** Wires up global + Vue error capture. Call once from main.ts after `createApp`. */
export function installErrorReporting(app: App) {
  app.config.errorHandler = (err) => report(toReport(err, 'vue'))

  window.addEventListener('error', (event) => {
    report(toReport(event.error ?? event.message, 'window'))
  })

  window.addEventListener('unhandledrejection', (event) => {
    report(toReport(event.reason, 'unhandledrejection'))
  })
}
