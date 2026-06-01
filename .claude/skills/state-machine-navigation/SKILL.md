---
description: Use when adding, editing, or wiring any screen component, navigation flow, or shared state in the app. Triggered by tasks like "add a new screen", "navigate to X", "add state for Y", "wire up a new tab", or any edit to app/page.tsx or components/screens/.
---

# State-Machine Navigation

## Core Principle

This app has **no Next.js routing**. The entire UI lives in a single page (`app/page.tsx`). Navigation is a state variable mutation. There are no routes, no URL changes, no history pushes.

## The Screen Union Type

The `Screen` union is defined **locally in `app/page.tsx`** (not in `lib/types.ts`):

```ts
type Screen =
  | 'home' | 'create-order'
  | 'searching-worker' | 'confirm-worker'
  | 'scheduled-jobs-board' | 'confirm-scheduled-worker'
  | 'active-booking' | 'review' | 'profile' | 'chat' | 'orders'
  | 'personal-info' | 'saved-workers' | 'help' | 'privacy'
  | 'worker-register' | 'worker-jobs' | 'worker-active' | 'worker-earnings' | 'worker-profile'
  | 'admin' | 'admin-verify' | 'admin-disputes' | 'admin-banking'
  | 'oauth-onboarding' | 'contact-otp-verify'
```

Pre-auth screens use a separate type also in `app/page.tsx`:
```ts
type PreAuthScreen = 'login' | 'register' | 'forgot-password' | 'otp-verify' | 'pin-reset'
```

**When adding a new screen:** add its string literal to the `Screen` union in `app/page.tsx` first, then create the component.

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
// Navigation
const [currentScreen, setCurrentScreen] = useState<Screen>('home')
const [preAuthScreen, setPreAuthScreen] = useState<PreAuthScreen>('login')

// User identity
const [userName, setUserName] = useState('...')
const [userPhone, setUserPhone] = useState('')
const [isWorker, setIsWorker] = useState(false)
const [activeMode, setActiveMode] = useState<'user' | 'worker'>('user')

// Booking flow
const [hasActiveBooking, setHasActiveBooking] = useState(false)
const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
const [matchedWorker, setMatchedWorker] = useState<MatchedWorker | null>(null)
const [selectedAcceptor, setSelectedAcceptor] = useState<OrderAcceptance | null>(null)

// Worker flow
const [activeWorkerOrderId, setActiveWorkerOrderId] = useState<string | null>(null)

// Chat
const [chatOrderId, setChatOrderId] = useState<string | null>(null)
const [chatBack, setChatBack] = useState<Screen>('active-booking')

// Auth sub-flows
const [forgotPhone, setForgotPhone] = useState('')
const [resetToken, setResetToken] = useState('')
const [otpContext, setOtpContext] = useState<OtpContext | null>(null)

// Back-link memory
const [personalInfoBack, setPersonalInfoBack] = useState<Screen>('profile')
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

`isWorker` + `activeMode` determine which bottom nav and which screens are reachable:

| Mode | Screens |
|------|---------|
| user (`activeMode='user'`) | home, create-order, searching-worker, confirm-worker, scheduled-jobs-board, confirm-scheduled-worker, active-booking, review, orders, chat, profile, personal-info, saved-workers, help, privacy |
| worker (`isWorker=true`, `activeMode='worker'`) | worker-jobs, worker-active, worker-earnings, worker-profile (+ chat in worker context) |
| admin (role='admin') | admin, admin-verify, admin-disputes, admin-banking |
| transition screen | worker-register (user → worker registration flow) |

The bottom nav components:
- `components/bottom-nav.tsx` — user mode (home, orders, chat, profile)
- `components/worker-bottom-nav.tsx` — worker mode (jobs, active, chat, earnings, profile)
- Admin has no bottom nav, uses a different layout

## Adding a New Screen — Checklist

1. Add the string literal to `Screen` union in `app/page.tsx`
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

- [ ] New screens added to the `Screen` union type in `app/page.tsx`
- [ ] Navigation uses `setCurrentScreen(...)` — no `router.push()` or `<Link>`
- [ ] Shared state (role, phone, workerId, hasActiveBooking) lives in `app/page.tsx`
- [ ] Screen components receive data/callbacks as props — no internal global state
- [ ] New screen component lives under `components/screens/`
- [ ] `app/page.tsx` render branch includes the new screen
- [ ] Bottom nav updated if the screen needs a tab
