/**
 * lib/supabase/withRetry.ts
 *
 * Wraps any async operation (DB query, fetch, etc.) with exponential-backoff retry.
 * Retries only on transient errors (network timeouts, 5xx, connection resets).
 * Never retries on 4xx (auth errors, validation failures) — those are permanent.
 */

interface RetryOptions {
  attempts?: number      // max attempts including the first (default 3)
  baseDelayMs?: number   // initial delay in ms, doubles each retry (default 300)
  label?: string         // for logging
}

function isTransient(err: unknown): boolean {
  if (!err) return false
  const msg = String((err as any)?.message ?? '').toLowerCase()
  const code = (err as any)?.code ?? ''
  const status = (err as any)?.status ?? (err as any)?.statusCode ?? 0

  // Network-level errors
  if (msg.includes('fetch failed') || msg.includes('network') || msg.includes('econnreset')) return true
  if (msg.includes('timeout') || msg.includes('timed out')) return true
  if (msg.includes('connection')) return true

  // Supabase / Postgres transient codes
  if (code === '08006' || code === '08001' || code === '08004') return true   // connection failure
  if (code === '57P03') return true   // cannot connect now
  if (code === '40001') return true   // serialization failure

  // HTTP 5xx (server-side transient)
  if (typeof status === 'number' && status >= 500) return true

  return false
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseDelayMs = 300, label = 'operation' }: RetryOptions = {}
): Promise<T> {
  let lastErr: unknown

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const transient = isTransient(err)

      if (!transient || attempt === attempts) {
        if (attempt > 1) {
          console.error(`[withRetry] ${label} failed after ${attempt} attempt(s):`, err)
        }
        throw err
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1)   // 300 → 600 → 1200
      console.warn(`[withRetry] ${label} attempt ${attempt} failed (transient). Retrying in ${delay}ms…`)
      await new Promise(r => setTimeout(r, delay))
    }
  }

  throw lastErr
}
