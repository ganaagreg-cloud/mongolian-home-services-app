# CLS Skeleton Fix

**Date:** 2026-06-05
**Routes affected:** `/home`, `/orders`, `/orders/new`
**Lighthouse CLS baseline:** 0.116

## Problem

Three client-side data fetches cause layout shift when content loads:

1. `/orders/new` — service picker grid starts empty (`serviceTypes = []`, no skeleton). The grid area has zero height until the `useEffect` API call resolves, then jumps to full grid height.
2. `/orders` — three skeleton rows (~216px) can swap to a tall empty state or a shorter order list, causing vertical collapse.
3. `/home` — workers horizontal row has no `min-height`; if `/api/workers` returns empty, the row collapses from ~168px to 0.

## Fix — Approach A: Surgical per-container changes

No new components or abstractions. Three targeted edits.

### 1. `packages/web/components/screens/create-order-screen.tsx`

Add `loadingServiceTypes` boolean state (initial value `true`). Set to `false` in the `useEffect` after both `.then()` and `.catch()` resolve.

While `loadingServiceTypes` is true and `preSelectedServiceId` is null, render 6 skeleton grid cards in the same `grid-cols-3` container:

```
div.grid.grid-cols-3.gap-3 (same wrapper as real cards)
  × 6: div.flex.flex-col.items-center.gap-2.rounded-2xl.bg-card.p-4.shadow-sm
         Skeleton h-6 w-6 rounded-lg   ← icon placeholder
         Skeleton h-3 w-16 mt-1        ← label placeholder
```

When `preSelectedServiceId` is non-null (navigated from home), the grid is skipped entirely and a service chip is shown instead — no skeleton needed there since the chip only renders once `selectedService` resolves. Add `min-h-[56px]` to the chip container to hold space while `serviceTypes` is still loading.

### 2. `packages/web/components/screens/orders-screen.tsx`

Add `min-h-[264px]` to the order list container:

```tsx
<div className="mt-4 space-y-3 px-6 min-h-[264px]">
```

264px = 3 skeleton rows × 80px each (48px avatar + 16px top padding + 16px bottom padding) + 2 × 12px `space-y-3` gaps.

### 3. `packages/web/components/screens/home-screen.tsx`

Add `min-h-[168px]` to the featured workers horizontal scroll container:

```tsx
<div className="mt-4 flex gap-3 overflow-x-auto px-6 pb-2 scrollbar-hide min-h-[168px]">
```

168px = 16px avatar top + 64px avatar + 8px gap + ~16px name + ~12px specialty + ~14px rating + 16px padding bottom ≈ 146px rounded up to 168px.

## What this does not change

- No new components
- No changes to skeleton card markup in home (already matches real card structure)
- No changes to the App Router loading.tsx files (wrong tool — only fires on navigation, not SWR fetches)
- No changes to API routes or data fetching logic

## Success criterion

Lighthouse CLS on `/home`, `/orders`, `/orders/new` drops below 0.05.
