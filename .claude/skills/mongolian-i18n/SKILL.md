---
description: Use when writing any user-facing string in a component or screen — labels, button text, headings, error messages, placeholders, toast notifications. Triggered by tasks involving UI text, copy changes, or adding new screens with Mongolian-facing content.
---

# Mongolian i18n Rules

## Core Rule

Every string visible to the end user must be wrapped in `t()`:

```tsx
// Correct
<h1>{t('home.title')}</h1>
<Button>{t('booking.confirm')}</Button>
<p className="text-muted-foreground">{t('search.empty')}</p>

// NEVER — bare string literal in JSX
<h1>Нүүр хуудас</h1>
<Button>Захиалах</Button>
```

Note: `t()` is not yet installed as a real i18n hook — use it as a placeholder wrapper. The key format is `screen.element` in dot notation.

## What Counts as a User-Facing String

**Must use `t()`:**
- Page titles and headings
- Button labels
- Input placeholders (`placeholder={t('...')}`)
- Error messages shown in the UI
- Toast notification text
- Empty state messages
- Tab labels in bottom nav
- Badge and chip labels

**Does NOT use `t()`:**
- TypeScript enum values and internal code symbols
- Database column names and API field names
- CSS class strings
- Log messages (these must not contain user PII anyway)
- TypeScript type literals in the `Screen` union

## Domain Term Table

| Монгол | English | Code symbol |
|--------|---------|-------------|
| ДАН | Mongolia's national digital identity | `danAuth` |
| Захиалга | Booking / order | `booking` |
| Цэвэрлэгч | Cleaner / service worker | `serviceWorker` |
| Шимтгэл | Platform commission (15%) | `commission` |
| Хохирлын сан | Damage fund (2%) | `damageFund` |
| Escrow | Pre-held payment released after job completion | `escrowRelease` |

Use these code symbols in TypeScript — use the Монгол terms only in `t()` translation keys or comments.

## Translation Key Conventions

```ts
// Format: <screen>.<element> or <screen>.<section>.<element>
t('home.greeting')
t('booking.confirm_button')
t('worker.jobs.empty_state')
t('payment.escrow.description')
t('dan.verification.pending')
```

## Anti-Patterns

```tsx
// NEVER — bare Mongolian string in JSX
<p>Захиалга олдсонгүй</p>

// NEVER — bare English string in JSX (app is Mongolian-first)
<Button>Book Now</Button>

// NEVER — string concatenation with t() (loses context for translators)
t('booking.status_' + status)   // use separate keys instead
```

## Pre-Submit Checklist

Before returning any component with user-visible text, verify:

- [ ] Every heading, label, button, placeholder, and message is wrapped in `t('...')`
- [ ] Translation keys follow `screen.element` dot notation
- [ ] Mongolian domain terms (ДАН, Захиалга, etc.) use correct code symbols in TypeScript
- [ ] No bare string literals in JSX return values
- [ ] Internal enum values and DB field names are NOT wrapped in `t()` (they're not user-facing)
