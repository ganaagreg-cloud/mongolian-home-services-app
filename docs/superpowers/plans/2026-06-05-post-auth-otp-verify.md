# Post-Auth OTP Re-Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let logged-in users complete phone/email verification from the Settings screen by navigating to a dedicated OTP entry page.

**Architecture:** One new Client Component page at `app/(app)/settings/verify-otp/page.tsx` wraps the existing `OtpVerifyScreen` (which already supports contact-verification mode via `otpContext`). `PersonalInfoScreen` replaces its post-send toast with a `router.push` to that page. On success the OTP page calls `router.replace('/settings')`, re-mounting PersonalInfoScreen which re-fetches `/api/me` and shows the verified badge.

**Tech Stack:** Next.js App Router, React, `OtpVerifyScreen` (components/otp-verify-screen.tsx), `apiFetch` (lib/api-fetch.ts)

---

### Task 1: Create the verify-otp page

**Files:**
- Create: `packages/web/app/(app)/settings/verify-otp/page.tsx`

- [ ] **Step 1: Create the page file with full content**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { OtpVerifyScreen } from '@/components/otp-verify-screen'

export default function VerifyOtpPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const type    = searchParams.get('type') ?? 'phone'
  const contact = searchParams.get('contact') ?? ''

  return (
    <OtpVerifyScreen
      phone={contact}
      otpContext={{
        purpose:      type === 'email' ? 'verify-email' : 'verify-phone',
        contactValue: contact,
      }}
      onBack={() => router.back()}
      onVerified={() => router.replace('/settings')}
    />
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd packages/web && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "packages/web/app/(app)/settings/verify-otp/page.tsx"
git commit -m "feat: add settings/verify-otp page for post-auth OTP entry"
```

---

### Task 2: Wire PersonalInfoScreen to navigate instead of toast

**Files:**
- Modify: `packages/web/components/screens/personal-info-screen.tsx`

The current `handleVerifyPhone` (line ~75) and `handleVerifyEmail` (line ~96) both end with `toast.success('Баталгаажуулах код илгээлээ')` on success. Replace each with a `router.push`.

- [ ] **Step 1: Replace the success toast in `handleVerifyPhone`**

Find this block in `handleVerifyPhone`:

```ts
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) {
        toast.error(data.error ?? 'Алдаа гарлаа')
        return
      }
      toast.success('Баталгаажуулах код илгээлээ')
```

Replace with:

```ts
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) {
        toast.error(data.error ?? 'Алдаа гарлаа')
        return
      }
      router.push(`/settings/verify-otp?type=phone&contact=${encodeURIComponent(localPhone)}`)
```

- [ ] **Step 2: Replace the success toast in `handleVerifyEmail`**

Find this block in `handleVerifyEmail`:

```ts
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) {
        toast.error(data.error ?? 'Алдаа гарлаа')
        return
      }
      toast.success('Баталгаажуулах код илгээлээ')
```

Replace with:

```ts
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) {
        toast.error(data.error ?? 'Алдаа гарлаа')
        return
      }
      router.push(`/settings/verify-otp?type=email&contact=${encodeURIComponent(email)}`)
```

- [ ] **Step 3: Run typecheck**

```bash
cd packages/web && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/web/components/screens/personal-info-screen.tsx
git commit -m "feat: navigate to OTP verify page after sending contact verification code"
```

---

### Task 3: Verify end-to-end

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Test phone verification flow**

1. Open `http://localhost:3000` and log in
2. Navigate to Profile → Personal Info (`/settings`)
3. If phone is unverified, tap "Баталгаажуулах →" next to the phone field
4. Confirm you are navigated to `/settings/verify-otp?type=phone&contact=...`
5. The OTP screen should show "Утас баталгаажуулалт" title and the masked phone number
6. Check the API server terminal — you should see `[MOCK SMS] Contact verify OTP: XXXXXX`
7. Enter the 6-digit code shown in the terminal
8. Tap "Баталгаажуулах" — should navigate back to `/settings`
9. The phone field should now show the green "Баталгаажсан" badge

- [ ] **Step 3: Test the back button**

Repeat steps 1–5 above, then tap the back arrow on the OTP screen. Should return to `/settings` without marking anything verified.

- [ ] **Step 4: Test error case**

Enter a wrong 6-digit code. Should show "Код буруу эсвэл хугацаа дууссан" inline error and allow re-entry.
