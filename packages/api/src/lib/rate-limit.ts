// Sliding-window in-memory rate limiter.
// Single-process only — does not survive restarts or share state across instances.

type Bucket = { ts: number[] }

const store = new Map<string, Bucket>()

// Evict stale buckets every 5 min to prevent unbounded memory growth.
setInterval(() => {
  const cutoff = Date.now() - 5 * 60_000
  for (const [key, b] of store) {
    if (!b.ts.length || b.ts[b.ts.length - 1]! < cutoff) store.delete(key)
  }
}, 5 * 60_000).unref()

/**
 * Returns a function that accepts a string key and returns true if the
 * request is within the allowed rate, false if it should be rejected.
 * The key should be "ip:route" or similar to scope limits per caller+endpoint.
 */
export function makeRateLimiter(windowMs: number, max: number): (key: string) => boolean {
  return function allowed(key: string): boolean {
    const now = Date.now()
    const cutoff = now - windowMs
    let b = store.get(key)
    if (!b) { b = { ts: [] }; store.set(key, b) }
    // Evict timestamps outside the current window
    let i = 0
    while (i < b.ts.length && b.ts[i]! <= cutoff) i++
    if (i > 0) b.ts = b.ts.slice(i)
    if (b.ts.length >= max) return false
    b.ts.push(now)
    return true
  }
}
