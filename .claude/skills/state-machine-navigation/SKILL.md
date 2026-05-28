---
description: Use when adding, editing, or wiring any screen component, navigation flow, or shared state in the app. Triggered by tasks like "add a new screen", "navigate to X", "add state for Y", "wire up a new tab", or any edit to app/page.tsx or components/screens/.
---

# State-Machine Navigation

## Core Principle

This app has **no Next.js routing**. The entire UI lives in a single page (`app/page.tsx`). Navigation is a state variable mutation. There are no routes, no URL changes, no history pushes.

## The Screen Union Type

All valid screens are listed in `lib/types.ts` as the `Screen` union:

```ts
type Screen =
  | 'home' | 'search' | 'booking' | 'active-booking' | 'review'
  | 'profile' | 'orders' | 'chat'
  | 'worker-register' | 'worker-jobs' | 'worker-active' | 'worker-earnings' | 'worker-profile'
  | 'admin' | 'admin-verify' | 'admin-disputes'
  // ... etc
```

**When adding a new screen:** add its string literal to the `Screen` union first, then create the component.

## Navigation

```ts
// Correct — the only way to navigate
setCurrentScreen('booking')
setCurrentScreen('worker-jobs')

// NEVER
import { useRouter } from 'next/navigation'
router.push('/booking')

// NEVER
import Link from 'next/link'
<Link href="/booking">Book</Link>
```

## Shared State in `app/page.tsx`

`app/page.tsx` owns all cross-screen state:

```ts
const [currentScreen, setCurrentScreen] = useState<Screen>('home')
const [userRole, setUserRole] = useState<UserRole | null>(null)
const [phone, setPhone] = useState('')
const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null)
const [hasActiveBooking, setHasActiveBooking] = useState(false)
```

Pass these down as **props** to screens. Screens never call `useState` for data that other screens need.

## Screen Components Are Dumb

Screens under `components/screens/` receive callbacks and data as props; they do not manage global state.

```ts
// Correct — screen receives navigation as a prop callback
interface HomeScreenProps {
  onNavigate: (screen: Screen) => void
  userRole: UserRole
}

// NEVER — screen calls setCurrentScreen directly (it doesn't have access)
// NEVER — screen manages userRole state itself
```

## Role-Based Screen Access

`userRole` determines which bottom nav and which screens are reachable:

| Role | Screens |
|------|---------|
| `user` | home, search, booking, active-booking, review, profile, orders, chat |
| `worker` | worker-register, worker-jobs, worker-active, worker-earnings, worker-profile |
| `admin` | admin, admin-verify, admin-disputes |

The bottom nav components:
- `components/bottom-nav.tsx` — user role
- `components/worker-bottom-nav.tsx` — worker role
- Admin has no bottom nav, uses a different layout

## Adding a New Screen — Checklist

1. Add the string literal to `Screen` union in `lib/types.ts`
2. Create `components/screens/<new-screen>.tsx` — accept props, no global state
3. Add the render branch in `app/page.tsx` (the big `currentScreen === '...'` switch/if chain)
4. Wire navigation from the relevant screen(s) via `setCurrentScreen`
5. If the screen needs a bottom nav tab: update the relevant `*-bottom-nav.tsx`

## Anti-Patterns

```ts
// NEVER — Next.js router in a screen component
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push('/some-screen')

// NEVER — <Link> for in-app navigation
<Link href="/booking">Go to booking</Link>

// NEVER — screen owns shared state
const [selectedWorkerId, setSelectedWorkerId] = useState(null)  // in a screen file

// NEVER — adding a screen without updating the Screen union type
// (causes TypeScript error on setCurrentScreen call)
```

## Pre-Submit Checklist

Before returning any screen or navigation code, verify:

- [ ] New screens added to the `Screen` union type in `lib/types.ts`
- [ ] Navigation uses `setCurrentScreen(...)` — no `router.push()` or `<Link>`
- [ ] Shared state (role, phone, workerId, hasActiveBooking) lives in `app/page.tsx`
- [ ] Screen components receive data/callbacks as props — no internal global state
- [ ] New screen component lives under `components/screens/`
- [ ] `app/page.tsx` render branch includes the new screen
- [ ] Bottom nav updated if the screen needs a tab
