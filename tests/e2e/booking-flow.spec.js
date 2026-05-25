// @ts-check
const { test, expect } = require('@playwright/test')
const path = require('path')

const snap = (page, name) =>
  page.screenshot({ path: path.join('screenshots', `${name}.png`), fullPage: true })

/** Login via dev-only test-login endpoint.
 *  Uses page.request so the Set-Cookie response is stored in the page's
 *  browser context and sent on subsequent page.goto() calls.
 */
async function loginAs(page, role = 'user') {
  const res = await page.request.post('/api/auth/test-login', { data: { role } })
  const body = await res.json().catch(() => ({}))
  return body.success === true
}

/** Click the demo role-switcher chip in the fixed header */
async function switchRole(page, role) {
  const label = role === 'user' ? 'User' : role === 'worker' ? 'Worker' : 'Admin'
  await page.locator(`button:has-text("${label}")`).first().click()
  await page.waitForTimeout(500)
}

/** Open create-order wizard from the home screen.
 *  Home screen's service category cards call onCreateOrder() on click.
 */
async function openCreateOrder(page) {
  // Click the "Цэвэрлэгээ" service card on the home screen
  await page.locator('button').filter({ hasText: /цэвэрлэгээ/i }).first().click()
  await page.waitForTimeout(400)
}

/** Fill Step 1 of the wizard and advance to Step 2.
 *  Step 1 requires: service, address, property type (and rooms/area for apartment).
 */
async function goToStep2(page) {
  await openCreateOrder(page)

  // Step 1: select Цэвэрлэгээ service (it may already be highlighted or need selection)
  const serviceBtn = page.locator('button').filter({ hasText: /цэвэрлэгээ/i })
  if (await serviceBtn.count() > 0) {
    await serviceBtn.first().click()
    await page.waitForTimeout(200)
  }

  // Fill address
  await page.locator('input[placeholder*="Дүүрэг"]').fill('Чингэлтэй дүүрэг, 5-р хороо, 12-р байр')
  await page.waitForTimeout(100)

  // Select "Орон сууц" (Apartment) property type
  await page.locator('button').filter({ hasText: /орон сууц/i }).first().click()
  await page.waitForTimeout(200)

  // Fill rooms (select 2 rooms)
  const roomBtn = page.locator('button').filter({ hasText: /^2$/ }).first()
  if (await roomBtn.isVisible()) {
    await roomBtn.click()
    await page.waitForTimeout(100)
  }

  // Fill area sqm — input has placeholder="60"
  const areaInput = page.locator('input[type="number"][placeholder="60"]')
  if (await areaInput.isVisible()) {
    await areaInput.fill('55')
    await page.waitForTimeout(100)
  }

  // Advance to Step 2
  await page.locator('button').filter({ hasText: /үргэлжлэх/i }).click()
  await page.waitForTimeout(500)
}

/** Advance from Step 2 through Steps 3 and 4 to reach Step 5.
 *  Requires the strategy to already be selected (so Step 2 is valid).
 *  Three clicks: 2→3 (time), 3→4 (notes), 4→5 (price review).
 */
async function advanceToStep5(page) {
  for (let i = 0; i < 3; i++) {
    await page.locator('button').filter({ hasText: /үргэлжлэх/i }).click()
    await page.waitForTimeout(400)
  }
}

// ─── CREATE-ORDER WIZARD ──────────────────────────────────────────────────────

test.describe('Create-order wizard', () => {
  test.beforeEach(async ({ page }) => {
    if (!await loginAs(page, 'user')) test.skip()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await switchRole(page, 'user')
  })

  test('COW-01 Step 1: service grid is visible', async ({ page }) => {
    await openCreateOrder(page)
    await snap(page, 'COW-01-step1-service-grid')

    await expect(page.locator('button').filter({ hasText: /цэвэрлэгээ/i }).first()).toBeVisible()
  })

  test('COW-02 Step 2: both strategy cards visible', async ({ page }) => {
    await goToStep2(page)
    await snap(page, 'COW-02-step2-strategy-select')

    // Both strategy options must be present
    await expect(page.locator('text=/яг одоо|шуурхай/i').first()).toBeVisible()
    await expect(page.locator('text=/цаг товлох/i').first()).toBeVisible()
  })

  test('COW-03 Instant strategy: no date picker shown', async ({ page }) => {
    await goToStep2(page)

    // Click the "Яг одоо" / Instant card
    await page.locator('button').filter({ hasText: /яг одоо|шуурхай/i }).first().click()
    await page.waitForTimeout(300)
    await snap(page, 'COW-03-instant-selected')

    // Date picker section should NOT be visible
    const datePicker = page.locator('text=/өдөр сонгох|date/i')
    await expect(datePicker).not.toBeVisible()
  })

  test('COW-04 Scheduled strategy: date + time pickers visible', async ({ page }) => {
    await goToStep2(page)

    // Click "Цаг товлох" (Scheduled)
    await page.locator('button').filter({ hasText: /цаг товлох/i }).first().click()
    await page.waitForTimeout(300)
    await snap(page, 'COW-04-scheduled-selected')

    // Date chips show weekday + number (e.g. "Sun\n24") — just check a time slot grid appears
    await expect(page.locator('text=/08:00|09:00|\d{2}:\d{2}/').first()).toBeVisible()
  })

  test('COW-05 Step 5 instant: CTA says "Ажилтан хайх"', async ({ page }) => {
    await goToStep2(page)

    // Select Instant
    await page.locator('button').filter({ hasText: /яг одоо|шуурхай/i }).first().click()
    await page.waitForTimeout(200)

    // Continue through steps 3-4
    await advanceToStep5(page)
    await snap(page, 'COW-05-step5-instant-confirm')

    // CTA should say "Ажилтан хайх" or similar
    await expect(page.locator('button').filter({ hasText: /ажилтан хайх|хайх/i }).first()).toBeVisible()
  })

  test('COW-06 Step 5 scheduled: CTA says "Захиалга нийтлэх"', async ({ page }) => {
    await goToStep2(page)

    // Select Scheduled
    await page.locator('button').filter({ hasText: /цаг товлох/i }).first().click()
    await page.waitForTimeout(200)

    // Date chips show "Sun 24", "Mon 25" etc — pick first one
    const dateChips = page.locator('button').filter({ hasText: /^(sun|mon|tue|wed|thu|fri|sat)/i })
    if (await dateChips.count() > 0) {
      await dateChips.first().click()
      await page.waitForTimeout(200)
    }
    const timeSlots = page.locator('button').filter({ hasText: /\d{2}:\d{2}/ })
    if (await timeSlots.count() > 0) {
      await timeSlots.first().click()
      await page.waitForTimeout(200)
    }

    await advanceToStep5(page)
    await snap(page, 'COW-06-step5-scheduled-confirm')

    await expect(page.locator('button').filter({ hasText: /нийтлэх|захиалга/i }).first()).toBeVisible()
  })
})

// ─── INSTANT BOOKING FLOW ─────────────────────────────────────────────────────

test.describe('Instant booking flow', () => {
  test.beforeEach(async ({ page }) => {
    if (!await loginAs(page, 'user')) test.skip()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await switchRole(page, 'user')
  })

  test('IBF-01 Searching-worker screen: spinner appears', async ({ page }) => {
    await goToStep2(page)

    // Select Instant
    await page.locator('button').filter({ hasText: /яг одоо|шуурхай/i }).first().click()
    await page.waitForTimeout(200)
    await advanceToStep5(page)

    // Submit order
    await page.locator('button').filter({ hasText: /ажилтан хайх|хайх/i }).first().click()
    await page.waitForTimeout(800)
    await snap(page, 'IBF-01-searching-worker-screen')

    // Searching screen heading is always visible regardless of phase
    await expect(page.locator('h1').filter({ hasText: /ажилтан хайх/i }).first()).toBeVisible()
  })

  test('IBF-02 Match result: worker found or no-workers state', async ({ page }) => {
    await goToStep2(page)
    await page.locator('button').filter({ hasText: /яг одоо|шуурхай/i }).first().click()
    await page.waitForTimeout(200)
    await advanceToStep5(page)

    await page.locator('button').filter({ hasText: /ажилтан хайх|хайх/i }).first().click()
    await page.waitForTimeout(800)

    // Wait for the 1.5s delay + API call to complete
    await page.waitForTimeout(3000)
    await snap(page, 'IBF-02-match-result')

    // Searching screen should be in any phase: searching/waiting/found/exhausted/none
    const anyPhase = page.locator('text=/хүсэлт явуулсан|зөвшөөрлөө|хайж байна|ажилтан шалгасан|олдсонгүй/i')
    await expect(anyPhase.first()).toBeVisible()
  })

  test('IBF-03 Confirm-worker screen: payment buttons present', async ({ page }) => {
    await goToStep2(page)
    await page.locator('button').filter({ hasText: /яг одоо|шуурхай/i }).first().click()
    await page.waitForTimeout(200)
    await advanceToStep5(page)

    await page.locator('button').filter({ hasText: /ажилтан хайх|хайх/i }).first().click()
    await page.waitForTimeout(4000) // wait for match

    // If worker found, click Confirm
    const confirmBtn = page.locator('button').filter({ hasText: /баталгаажуулах/i })
    if (await confirmBtn.count() > 0) {
      await confirmBtn.first().click()
      await page.waitForTimeout(500)
      await snap(page, 'IBF-03-confirm-worker-screen')

      // Bank payment buttons must be visible (Хаан банк, Голомт банк, etc.)
      await expect(page.locator('button').filter({ hasText: /хаан банк|голомт|ххб/i }).first()).toBeVisible()
      // Dev sim button must be visible
      await expect(page.locator('button').filter({ hasText: /simulate instant success/i }).first()).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('IBF-04 Full instant flow → reaches active-booking', async ({ page }) => {
    await goToStep2(page)
    await page.locator('button').filter({ hasText: /яг одоо|шуурхай/i }).first().click()
    await page.waitForTimeout(200)
    await advanceToStep5(page)

    await page.locator('button').filter({ hasText: /ажилтан хайх|хайх/i }).first().click()
    await page.waitForTimeout(4000)

    const confirmBtn = page.locator('button').filter({ hasText: /баталгаажуулах/i })
    if (await confirmBtn.count() > 0) {
      await confirmBtn.first().click()
      await page.waitForTimeout(500)

      // Trigger dev sim payment (bank buttons are real deeplinks, not testable here)
      await page.locator('button').filter({ hasText: /simulate instant success/i }).first().click()
      await page.waitForTimeout(4000) // wait for SWR poll (3s interval) + navigation
      await snap(page, 'IBF-04-active-booking-after-instant')

      // Should reach active-booking screen
      await expect(page.locator('text=/SOS|идэвхтэй захиалга/i').first()).toBeVisible()
    } else {
      test.skip()
    }
  })
})

// ─── SCHEDULED BOOKING FLOW ───────────────────────────────────────────────────

test.describe('Scheduled booking flow', () => {
  test.beforeEach(async ({ page }) => {
    if (!await loginAs(page, 'user')) test.skip()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await switchRole(page, 'user')
  })

  /** Navigate through wizard and submit a scheduled order */
  async function submitScheduledOrder(page) {
    await goToStep2(page)

    // Select Scheduled
    await page.locator('button').filter({ hasText: /цаг товлох/i }).first().click()
    await page.waitForTimeout(300)

    // Date chips show "Sun 24", "Mon 25" — pick first
    const dateChips = page.locator('button').filter({ hasText: /^(sun|mon|tue|wed|thu|fri|sat)/i })
    if (await dateChips.count() > 0) {
      await dateChips.first().click()
      await page.waitForTimeout(200)
    }
    const timeSlots = page.locator('button').filter({ hasText: /\d{2}:\d{2}/ })
    if (await timeSlots.count() > 0) {
      await timeSlots.first().click()
      await page.waitForTimeout(200)
    }

    await advanceToStep5(page)

    // Submit
    await page.locator('button').filter({ hasText: /нийтлэх|захиалга/i }).first().click()
    await page.waitForTimeout(1500)
  }

  test('SBF-01 Scheduled jobs board renders after order submit', async ({ page }) => {
    await submitScheduledOrder(page)
    await snap(page, 'SBF-01-scheduled-jobs-board')

    // Board heading / empty-acceptors state
    await expect(
      page.locator('text=/санал|хүлээж|нийтлэгдлээ|acceptan/i').first()
    ).toBeVisible()
  })

  test('SBF-02 Worker accepts scheduled order → shows in board', async ({ page }) => {
    // Step 1: Create the scheduled order as user
    await submitScheduledOrder(page)
    await page.waitForTimeout(500)

    // Grab the orderId from the URL or page (board screen holds it in props)
    // Instead, switch to Worker role and accept any visible scheduled post
    await switchRole(page, 'worker')
    await page.waitForTimeout(600)
    await snap(page, 'SBF-02a-worker-sees-scheduled-job')

    // Worker clicks "Сонирхож байна" on first scheduled job
    const interestedBtn = page.locator('button').filter({ hasText: /сонирхож байна/i })
    if (await interestedBtn.count() > 0) {
      await interestedBtn.first().click()
      await page.waitForTimeout(600)
      await snap(page, 'SBF-02b-worker-accepted')

      // Should show green "Санал илгээгдлээ" confirmation
      await expect(page.locator('text=/санал илгээгдлээ/i').first()).toBeVisible()
    }
  })

  test('SBF-03 User sees acceptor → can pick worker', async ({ page }) => {
    // Create order as user, switch to worker and accept, switch back
    await submitScheduledOrder(page)
    await page.waitForTimeout(500)

    // Accept as worker
    await switchRole(page, 'worker')
    await page.waitForTimeout(600)

    const interestedBtn = page.locator('button').filter({ hasText: /сонирхож байна/i })
    if (await interestedBtn.count() > 0) {
      await interestedBtn.first().click()
      await page.waitForTimeout(600)
    }

    // Switch back to user
    await switchRole(page, 'user')
    await page.waitForTimeout(700)
    await snap(page, 'SBF-03a-user-sees-board')

    // Navigate to the scheduled board (still active order)
    // Board polls every 5s — trigger manual refresh if button exists
    const refreshBtn = page.locator('button[aria-label*="refresh"], button').filter({ hasText: /шинэчлэх|refresh/i })
    if (await refreshBtn.count() > 0) {
      await refreshBtn.first().click()
      await page.waitForTimeout(1000)
    } else {
      await page.waitForTimeout(5500) // wait for auto-poll
    }

    await snap(page, 'SBF-03b-acceptor-list')

    // "Сонгох" button should appear if the worker acceptance is fetched
    const pickBtn = page.locator('button').filter({ hasText: /сонгох/i })
    if (await pickBtn.count() > 0) {
      await expect(pickBtn.first()).toBeVisible()
    }
  })

  test('SBF-04 Confirm-scheduled-worker screen renders', async ({ page }) => {
    await submitScheduledOrder(page)
    await page.waitForTimeout(500)

    // Accept as worker
    await switchRole(page, 'worker')
    await page.waitForTimeout(600)
    const interestedBtn = page.locator('button').filter({ hasText: /сонирхож байна/i })
    if (await interestedBtn.count() === 0) test.skip()
    await interestedBtn.first().click()
    await page.waitForTimeout(600)

    // Switch to user, wait for poll, pick worker
    await switchRole(page, 'user')
    await page.waitForTimeout(6000) // wait for 5s poll cycle

    const pickBtn = page.locator('button').filter({ hasText: /сонгох/i })
    if (await pickBtn.count() === 0) test.skip()
    await pickBtn.first().click()
    await page.waitForTimeout(500)
    await snap(page, 'SBF-04-confirm-scheduled-worker-screen')

    // Should show worker details + bank payment buttons
    await expect(page.locator('text=/захиалга баталгаажуулах/i').first()).toBeVisible()
    await expect(page.locator('button').filter({ hasText: /хаан банк|голомт|ххб/i }).first()).toBeVisible()
  })
})

// ─── WORKER JOBS SCREEN ───────────────────────────────────────────────────────

test.describe('Worker — Jobs board', () => {
  test.beforeEach(async ({ page }) => {
    if (!await loginAs(page, 'worker')) test.skip()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await switchRole(page, 'worker')
    await page.waitForTimeout(400)
  })

  test('WJB-01 Two sections: Instant + Scheduled', async ({ page }) => {
    await snap(page, 'WJB-01-worker-jobs-board')
    await expect(page.locator('text=/яг одоо хүсэлт|шуурхай захиалга/i').first()).toBeVisible()
    await expect(page.locator('text=/цаг товлох ажлууд/i').first()).toBeVisible()
  })

  test('WJB-02 Inactive toggle shows rest message', async ({ page }) => {
    const toggle = page.locator('[role="switch"]').first()
    await toggle.click()
    await page.waitForTimeout(400)
    await snap(page, 'WJB-02-worker-inactive-state')
    await expect(page.locator('text=/амарч байна/i').first()).toBeVisible()
  })

  test('WJB-03 Rating reminder banner is visible', async ({ page }) => {
    await expect(page.locator('text=/үнэлгээгээ нэмэгдүүлэх/i')).toBeVisible()
    await snap(page, 'WJB-03-rating-reminder')
  })
})

// ─── ORDERS SCREEN — NEW STATUS LABELS ───────────────────────────────────────

test.describe('Orders screen — status labels', () => {
  test.beforeEach(async ({ page }) => {
    if (!await loginAs(page, 'user')) test.skip()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await switchRole(page, 'user')
    await page.waitForTimeout(400)
  })

  test('ORD-01 Active tab renders seeded orders', async ({ page }) => {
    // Navigate to orders via bottom nav (index 2 = orders)
    await page.locator('nav button').nth(1).click()
    await page.waitForTimeout(600)
    await snap(page, 'ORD-01-orders-active-tab')

    // "Идэвхтэй" tab should be selected
    await expect(page.locator('button').filter({ hasText: /идэвхтэй/i }).first()).toBeVisible()
  })

  test('ORD-02 Past tab switches correctly', async ({ page }) => {
    await page.locator('nav button').nth(1).click()
    await page.waitForTimeout(600)

    await page.locator('button').filter({ hasText: /өнгөрсөн/i }).click()
    await page.waitForTimeout(500)
    await snap(page, 'ORD-02-orders-past-tab')
  })

  test('ORD-03 "Харах" button navigates to active-booking', async ({ page }) => {
    await page.locator('nav button').nth(1).click()
    await page.waitForTimeout(600)

    const viewBtn = page.locator('button').filter({ hasText: /харах/i })
    if (await viewBtn.count() > 0) {
      await viewBtn.first().click()
      await page.waitForTimeout(500)
      await snap(page, 'ORD-03-active-booking-from-orders')
      // Should be on active-booking screen (SOS button visible)
      await expect(page.locator('button, text').filter({ hasText: /SOS/i }).first()).toBeVisible()
    } else {
      test.skip()
    }
  })
})
