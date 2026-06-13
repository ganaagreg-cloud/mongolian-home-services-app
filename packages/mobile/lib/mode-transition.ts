// Bridges ModeToggle's optimistic navigation with the (worker) route guard.
// Without this, the guard's own /api/auth/me fetch can resolve before the
// PATCH /api/me/mode commits server-side and bounce the user back out.
let pendingMode: 'user' | 'worker' | null = null

export function setPendingMode(mode: 'user' | 'worker' | null) {
  pendingMode = mode
}

export function getPendingMode() {
  return pendingMode
}
