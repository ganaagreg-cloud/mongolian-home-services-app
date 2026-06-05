# CLS Skeleton Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate CLS 0.116 on `/home`, `/orders`, and `/orders/new` by ensuring skeleton containers hold their height when content loads.

**Architecture:** Three surgical edits — add a `loadingServiceTypes` guard + skeleton tiles to `CreateOrderScreen`, add `min-h-[264px]` to the orders list container, and add `min-h-[168px]` to the home workers scroll row. No new files or components.

**Tech Stack:** Next.js App Router, React, SWR, Tailwind CSS 4, shadcn `Skeleton`

---

### Task 1: Fix `/orders/new` — service picker skeleton

**Files:**
- Modify: `packages/web/components/screens/create-order-screen.tsx`

- [ ] **Step 1: Add `loadingServiceTypes` state**

In `CreateOrderScreen`, directly after the existing `const [serviceLoadError, setServiceLoadError] = useState(false)` line (around line 75), add:

```tsx
const [loadingServiceTypes, setLoadingServiceTypes] = useState(true)
```

- [ ] **Step 2: Set loading to false in the useEffect**

The existing `useEffect` (lines 77–96) has two terminal branches: `.then(...)` (success) and `.catch(...)`. Add `setLoadingServiceTypes(false)` as the last call in each:

```tsx
useEffect(() => {
  apiFetch('/api/service-types')
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
    .then((j: { success: boolean; data?: ServiceType[] }) => {
      if (j.success && j.data?.length) {
        setServiceTypes(j.data)
        const validId = preSelectedServiceId != null && j.data.some((s) => s.id === preSelectedServiceId)
          ? preSelectedServiceId
          : j.data[0]!.id
        setServiceTypeId(validId)
      } else {
        setServiceLoadError(true)
      }
      setLoadingServiceTypes(false)
    })
    .catch(() => {
      setServiceLoadError(true)
      setLoadingServiceTypes(false)
    })
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

- [ ] **Step 3: Render skeleton grid while loading (no pre-selected service)**

Find the `{preSelectedServiceId != null ? ( ... ) : ( /* Full picker grid */ )}` block (around line 309). Replace the `/* Full picker grid */` branch so it shows skeletons while `loadingServiceTypes` is true:

```tsx
) : loadingServiceTypes ? (
  /* Skeleton grid — holds space while service types load */
  <div className="mt-3 grid grid-cols-3 gap-3">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="flex flex-col items-center gap-2 rounded-2xl bg-card p-4 shadow-sm">
        <Skeleton className="h-6 w-6 rounded-lg" />
        <Skeleton className="h-3 w-16" />
      </div>
    ))}
  </div>
) : (
  /* Full picker grid */
  <div className="mt-3 grid grid-cols-3 gap-3">
    {serviceTypes.map((s) => {
      const Icon = ICON_MAP[s.icon as keyof typeof ICON_MAP] ?? Sparkles
      return (
        <button
          key={s.id}
          onClick={() => {
            setServiceTypeId(s.id)
            setBookingData({ quantity: 0, estimatedHours: 1, isValid: false })
            setStep1Submitted(false)
          }}
          className={`flex flex-col items-center gap-2 rounded-2xl p-4 transition-all active:scale-95 ${
            serviceTypeId === s.id
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-card text-foreground shadow-sm hover:shadow-md'
          }`}
        >
          <Icon className="h-6 w-6" />
          <span className="text-center text-xs font-medium leading-tight">{s.name_mn}</span>
        </button>
      )
    })}
  </div>
)
```

- [ ] **Step 4: Hold space for the pre-selected chip while loading**

Find the pre-selected chip container (the `div` with `mt-3 flex items-center gap-3 rounded-2xl bg-primary/10 px-4 py-3 shadow-sm`). Add `min-h-[56px]`:

```tsx
<div className="mt-3 flex items-center gap-3 rounded-2xl bg-primary/10 px-4 py-3 shadow-sm min-h-[56px]">
```

- [ ] **Step 5: Verify `Skeleton` is imported**

Check the import block at the top of the file. If `Skeleton` is not already imported from `@/components/ui/skeleton`, add it:

```tsx
import { Skeleton } from '@/components/ui/skeleton'
```

- [ ] **Step 6: Commit**

```bash
git add packages/web/components/screens/create-order-screen.tsx
git commit -m "fix: add service-picker skeleton to eliminate CLS on /orders/new"
```

---

### Task 2: Fix `/orders` — list container min-height

**Files:**
- Modify: `packages/web/components/screens/orders-screen.tsx`

- [ ] **Step 1: Add min-height to the order list container**

Find the order list container (around line 252):

```tsx
<div className="mt-4 space-y-3 px-6">
```

Change it to:

```tsx
<div className="mt-4 space-y-3 px-6 min-h-[264px]">
```

264px = 3 skeleton rows × 80px each + 2 × 12px `space-y-3` gaps. This prevents the container from collapsing when an empty state or short list replaces the three skeletons.

- [ ] **Step 2: Commit**

```bash
git add packages/web/components/screens/orders-screen.tsx
git commit -m "fix: add min-height to orders list container to prevent CLS"
```

---

### Task 3: Fix `/home` — featured workers row min-height

**Files:**
- Modify: `packages/web/components/screens/home-screen.tsx`

- [ ] **Step 1: Add min-height to the workers scroll row**

Find the featured workers horizontal scroll container (around line 170):

```tsx
<div className="mt-4 flex gap-3 overflow-x-auto px-6 pb-2 scrollbar-hide">
```

Change it to:

```tsx
<div className="mt-4 flex gap-3 overflow-x-auto px-6 pb-2 scrollbar-hide min-h-[168px]">
```

168px matches the height of the worker skeleton cards (16px top padding + 64px avatar + 8px gap + ~16px name + ~12px specialty + ~14px rating row + 16px bottom padding + 2px buffer). Prevents collapse if `/api/workers` returns an empty array.

- [ ] **Step 2: Commit**

```bash
git add packages/web/components/screens/home-screen.tsx
git commit -m "fix: add min-height to home workers row to prevent CLS"
```

---

### Task 4: Verify

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev:web
```

- [ ] **Step 2: Manually verify each route**

Open `http://localhost:3000`. For each route, throttle the network (Chrome DevTools → Network → Slow 3G) and observe:

- `/home` — categories grid and workers row should not shift on load
- `/orders` — list area should stay at least 264px tall (no collapse to empty state)
- `/orders/new` — service picker should show 6 skeleton tiles before real tiles appear; no jump

- [ ] **Step 3: Run typecheck**

```bash
cd packages/web && pnpm exec tsc --noEmit
```

Expected: no errors.
