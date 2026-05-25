// @ts-check
const { test, expect } = require('@playwright/test')
const path = require('path')

const snap = (page, name) => page.screenshot({ path: path.join('screenshots', `${name}.png`), fullPage: true })

// The main app uses a state machine — navigate to / and use API to set cookies
// so we can reach each screen as each role.

// ─── ONBOARDING (unauthenticated) ────────────────────────────────────────────
test('10. Unauthenticated / → shows onboarding', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await snap(page, '10-onboarding-1')

  // Swipe/click through 3 onboarding slides
  const continueBtn = page.locator('button').filter({ hasText: /үргэлжлүүлэх/i })
  if (await continueBtn.isVisible()) {
    await continueBtn.click()
    await page.waitForTimeout(400)
    await snap(page, '10b-onboarding-2')
    await continueBtn.click()
    await page.waitForTimeout(400)
    await snap(page, '10c-onboarding-3')
  }
})

// ─── ONBOARDING SKIP ─────────────────────────────────────────────────────────
test('11. Onboarding skip → goes to login', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const skipBtn = page.locator('button').filter({ hasText: /алгасах/i })
  if (await skipBtn.isVisible()) {
    await skipBtn.click()
    await page.waitForTimeout(500)
    await snap(page, '11-onboarding-skip')
  } else {
    test.skip()
  }
})

// ─── USER HOME (authenticated as user) ───────────────────────────────────────
// We inject an auth cookie/session by calling the login API first
test.describe('User flows (authenticated)', () => {
  test.beforeEach(async ({ page, request }) => {
    // Try to login via API to get a session cookie
    const res = await request.post('/api/auth/login', {
      data: { email: 'user@test.com', password: 'password123' },
    })
    const body = await res.json().catch(() => ({}))
    // If login succeeded the cookie is automatically stored in the context
    // If not (no test user), we'll note it in findings
    if (!body.success) {
      test.skip() // No test user seeded — skip authenticated flow tests
    }
  })

  test('20. Home screen', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await snap(page, '20-user-home')
  })

  test('21. Search screen', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.locator('[aria-label*="search"], button').filter({ hasText: /хайх|хайлт/i }).first().click().catch(() => {})
    // Bottom nav search tab
    await page.locator('nav button, [role="tablist"] button').nth(1).click().catch(() => {})
    await page.waitForTimeout(500)
    await snap(page, '21-user-search')
  })

  test('22. Profile screen', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Last bottom nav item = profile
    await page.locator('nav button, [role="tablist"] button').last().click().catch(() => {})
    await page.waitForTimeout(500)
    await snap(page, '22-user-profile')
  })

  test('23. Orders screen', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // 3rd bottom nav item = orders
    await page.locator('nav button, [role="tablist"] button').nth(2).click().catch(() => {})
    await page.waitForTimeout(500)
    await snap(page, '23-user-orders')
  })
})
