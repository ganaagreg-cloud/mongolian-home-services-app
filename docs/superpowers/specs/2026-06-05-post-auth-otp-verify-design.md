# Post-Auth OTP Re-Verification Design

**Date:** 2026-06-05
**Route affected:** `/settings` (PersonalInfoScreen is mounted at `app/(app)/settings/page.tsx`)

## Problem

`PersonalInfoScreen` lets logged-in users verify their phone or email by tapping "Баталгаажуулах →". This calls `POST /api/me/send-verify-otp` and sends the code — but then shows only a success toast. There is no UI to enter the code, so `phone_verified` / `email_verified` can never be set to `true` from the settings screen.

## What Already Exists

Both API endpoints are complete and require no changes:

- `POST /api/me/send-verify-otp` — sends OTP to `otp_codes` (phone) or `email_otp_codes` (email)
- `PATCH /api/me/verify-contact` — validates the 6-digit code, deletes it, sets `phone_verified` / `email_verified = true`

`OtpVerifyScreen` (`components/otp-verify-screen.tsx`) already supports contact-verification mode via the `otpContext` prop:
- When `otpContext.purpose` is `'verify-phone'` or `'verify-email'`, it calls `PATCH /api/me/verify-contact`
- Resend calls `POST /api/me/send-verify-otp`
- `onVerified('')` is called on success (empty string — no reset token in this mode)

## Solution — Approach C: Navigate to a new routable OTP page

One new page + two line changes in PersonalInfoScreen. No changes to `OtpVerifyScreen`.

### New file: `app/(app)/settings/verify-otp/page.tsx`

Client Component. Reads `type` and `contact` from `searchParams`:

- `type`: `'phone'` | `'email'`
- `contact`: the raw phone number or email address (URL-encoded)

Renders `OtpVerifyScreen` with:

```tsx
<OtpVerifyScreen
  phone={contact}
  otpContext={{
    purpose: type === 'phone' ? 'verify-phone' : 'verify-email',
    contactValue: contact,
  }}
  onBack={() => router.back()}
  onVerified={() => router.replace('/settings')}
/>
```

`router.replace('/settings')` causes a fresh navigation to PersonalInfoScreen, which re-mounts and re-runs its `useEffect` → re-fetches `GET /api/me` → now returns `phoneVerified: true` or `emailVerified: true` → green checkmark renders.

### Changes to `personal-info-screen.tsx`

In `handleVerifyPhone`, replace the success toast with navigation:

```ts
// before
toast.success('Баталгаажуулах код илгээлээ')

// after
router.push(`/settings/verify-otp?type=phone&contact=${encodeURIComponent(localPhone)}`)
```

Same change in `handleVerifyEmail`:

```ts
router.push(`/settings/verify-otp?type=email&contact=${encodeURIComponent(email)}`)
```

The `sendingOtp` state and error handling remain unchanged — if the OTP send fails, we still show a toast and don't navigate.

## Data Flow

```
PersonalInfoScreen
  → tap "Баталгаажуулах →"
  → POST /api/me/send-verify-otp  (sends code)
  → on success: router.push('/settings/verify-otp?type=phone&contact=...')

verify-otp/page.tsx
  → renders OtpVerifyScreen with otpContext
  → user enters 6-digit code
  → PATCH /api/me/verify-contact  (validates + sets phone_verified=true)
  → onVerified: router.replace('/settings')

PersonalInfoScreen (re-mounted)
  → useEffect: GET /api/me
  → phoneVerified: true → green checkmark
```

## What Does Not Change

- `OtpVerifyScreen` — no changes
- `POST /api/me/send-verify-otp` — no changes
- `PATCH /api/me/verify-contact` — no changes
- Auth layout or middleware — no changes

## Success Criterion

A logged-in user with an unverified phone can tap "Баталгаажуулах →", enter the 6-digit code, and return to Personal Info with the green "Баталгаажсан" badge showing.
