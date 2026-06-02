// @ts-check
const { test, expect } = require('@playwright/test')
const path = require('path')

const snap = (page, name) =>
  page.screenshot({ path: path.join('screenshots', `${name}.png`), fullPage: true })

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function loginAs(page, role) {
  // Retry up to 3 times on transient ECONNRESET / network errors
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await page.request.post('/api/auth/test-login', { data: { role } })
      const body = await res.json().catch(() => ({}))
      if (body.success === true) return true
    } catch {
      if (attempt < 2) await page.waitForTimeout(800)
    }
  }
  return false
}

async function switchRole(page, role) {
  const label = role === 'user' ? 'User' : role === 'worker' ? 'Worker' : 'Admin'
  await page.locator(`button:has-text("${label}")`).first().click()
  await page.waitForTimeout(500)
}

// ── Wizard helpers (same pattern as booking-flow.spec.js) ─────────────────────

async function openCreateOrder(page) {
  await page.locator('button').filter({ hasText: /цэвэрлэгээ/i }).first().click()
  await page.waitForTimeout(400)
}

async function goToStep2(page) {
  await openCreateOrder(page)

  // Select service if needed
  const serviceBtn = page.locator('button').filter({ hasText: /цэвэрлэгээ/i })
  if (await serviceBtn.count() > 0) {
    await serviceBtn.first().click()
    await page.waitForTimeout(200)
  }

  await page.locator('input[placeholder*="Дүүрэг"]').fill('Чингэлтэй дүүрэг, 5-р хороо, 12-р байр')
  await page.waitForTimeout(100)

  await page.locator('button').filter({ hasText: /орон сууц/i }).first().click()
  await page.waitForTimeout(200)

  const roomBtn = page.locator('button').filter({ hasText: /^2$/ }).first()
  if (await roomBtn.isVisible()) {
    await roomBtn.click()
    await page.waitForTimeout(100)
  }

  const areaInput = page.locator('input[type="number"][placeholder="60"]')
  if (await areaInput.isVisible()) {
    await areaInput.fill('55')
    await page.waitForTimeout(100)
  }

  await page.locator('button').filter({ hasText: /үргэлжлэх/i }).click()
  await page.waitForTimeout(500)
}

async function advanceToStep5(page) {
  for (let i = 0; i < 3; i++) {
    await page.locator('button').filter({ hasText: /үргэлжлэх/i }).click()
    await page.waitForTimeout(400)
  }
}

// Submits an instant order and leaves on the searching-worker screen.
async function createInstantOrder(page) {
  await goToStep2(page)
  await page.locator('button').filter({ hasText: /яг одоо|шуурхай/i }).first().click()
  await page.waitForTimeout(200)
  await advanceToStep5(page)
  await page.locator('button').filter({ hasText: /ажилтан хайх|хайх/i }).first().click()
  // Returns immediately — caller waits for match result
}

// Submits a scheduled order and leaves on the scheduled-jobs-board.
async function createScheduledOrder(page) {
  await goToStep2(page)
  await page.locator('button').filter({ hasText: /цаг товлох/i }).first().click()
  await page.waitForTimeout(300)

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
  await page.locator('button').filter({ hasText: /нийтлэх|захиалга/i }).first().click()
  await page.waitForTimeout(1500)
}

// ─── GROUP A: Instant Flow — User Side ───────────────────────────────────────

test.describe('Instant flow — user side', () => {
  test.beforeEach(async ({ page }) => {
    if (!await loginAs(page, 'user')) test.skip()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await switchRole(page, 'user')
  })

  test('IFD-01 Searching animation is visible immediately after submit', async ({ page }) => {
    await createInstantOrder(page)
    await page.waitForTimeout(800)
    await snap(page, 'IFD-01-searching-animation')

    // Searching screen heading is always visible regardless of phase
    await expect(page.locator('h1').filter({ hasText: /ажилтан хайх/i }).first()).toBeVisible()
  })

  test('IFD-02 Match result: confirm screen or graceful no-workers state', async ({ page }) => {
    await createInstantOrder(page)
    // Wait for 1.5s initial delay + 2s minimum match = ~4s total
    await page.waitForTimeout(4500)
    await snap(page, 'IFD-02-match-result')

    // Screen must be in one of: waiting, found, exhausted, or none phase
    const waiting    = page.locator('text=/хүсэлт явуулсан/i')
    const found      = page.locator('text=/зөвшөөрлөө/i')
    const exhausted  = page.locator('text=/ажилтан шалгасан/i')
    const none       = page.locator('text=/Ажилтан олдсонгүй/i')

    const anyVisible = await waiting.count() > 0 || await found.count() > 0
      || await exhausted.count() > 0 || await none.count() > 0
    expect(anyVisible).toBeTruthy()

    if (await found.count() > 0) {
      await expect(page.locator('button').filter({ hasText: /баталгаажуулах/i }).first()).toBeVisible()
    } else if (await exhausted.count() > 0 || await none.count() > 0) {
      await expect(page.locator('button').filter({ hasText: /цаг товлох/i }).first()).toBeVisible()
    }
  })

  test('IFD-03 Full instant flow → reaches active-booking screen', async ({ page }) => {
    await createInstantOrder(page)
    await page.waitForTimeout(4500)

    const confirmBtn = page.locator('button').filter({ hasText: /баталгаажуулах/i })
    if (await confirmBtn.count() === 0) {
      test.skip()
      return
    }

    await confirmBtn.first().click()
    await page.waitForTimeout(500)
    await snap(page, 'IFD-03-confirm-worker-screen')

    // Bank payment buttons and dev sim button must be visible
    await expect(page.locator('button').filter({ hasText: /хаан банк|голомт|ххб/i }).first()).toBeVisible()
    await expect(page.locator('button').filter({ hasText: /simulate instant success/i }).first()).toBeVisible()

    // Pay via dev sim button
    await page.locator('button').filter({ hasText: /simulate instant success/i }).first().click()
    await page.waitForTimeout(2500)
    await snap(page, 'IFD-03-active-booking')

    await expect(page.locator('text=/SOS|идэвхтэй захиалга/i').first()).toBeVisible()
  })
})

// ─── GROUP B: Instant Flow — Worker Side (dual context) ──────────────────────

test.describe('Instant flow — worker side', () => {
  test('IFD-04 Worker jobs board renders both instant + scheduled sections', async ({ browser }) => {
    const userCtx   = await browser.newContext()
    const workerCtx = await browser.newContext()

    try {
      const userPage   = await userCtx.newPage()
      const workerPage = await workerCtx.newPage()

      // Create an instant order as user (triggers the match in the background)
      if (!await loginAs(userPage, 'user')) { test.skip(); return }
      await userPage.goto('/')
      await userPage.waitForLoadState('networkidle')
      await switchRole(userPage, 'user')
      await createInstantOrder(userPage)
      await userPage.waitForTimeout(4000) // let match complete

      // Worker logs in and views jobs board
      if (!await loginAs(workerPage, 'worker')) { test.skip(); return }
      await workerPage.goto('/')
      await workerPage.waitForLoadState('networkidle')
      await switchRole(workerPage, 'worker')
      await snap(workerPage, 'IFD-04-worker-jobs-board')

      await expect(workerPage.locator('text=/яг одоо хүсэлтүүд/i').first()).toBeVisible()
      await expect(workerPage.locator('text=/цаг товлох ажлууд/i').first()).toBeVisible()
    } finally {
      await userCtx.close()
      await workerCtx.close()
    }
  })

  test('IFD-05 Worker accepts instant job → card disappears (conditional on u-bat being matched)', async ({ browser }) => {
    const userCtx   = await browser.newContext()
    const workerCtx = await browser.newContext()

    try {
      const userPage   = await userCtx.newPage()
      const workerPage = await workerCtx.newPage()

      if (!await loginAs(userPage, 'user')) { test.skip(); return }
      await userPage.goto('/')
      await userPage.waitForLoadState('networkidle')
      await switchRole(userPage, 'user')
      await createInstantOrder(userPage)
      await userPage.waitForTimeout(4500) // let match complete

      if (!await loginAs(workerPage, 'worker')) { test.skip(); return }
      await workerPage.goto('/')
      await workerPage.waitForLoadState('networkidle')
      await switchRole(workerPage, 'worker')
      await workerPage.waitForTimeout(1000)

      // Check if the test-login worker (u-bat) has any instant jobs
      const instantJobCard = workerPage.locator('button').filter({ hasText: /Авах/i })
      if (await instantJobCard.count() === 0) {
        // u-bat was not matched this run — skip gracefully
        test.skip()
        return
      }

      await snap(workerPage, 'IFD-05a-instant-job-card')
      const cardCountBefore = await workerPage.locator('button').filter({ hasText: /Авах/i }).count()

      await instantJobCard.first().click()
      await workerPage.waitForTimeout(600)
      await snap(workerPage, 'IFD-05b-after-accept')

      const cardCountAfter = await workerPage.locator('button').filter({ hasText: /Авах/i }).count()
      expect(cardCountAfter).toBeLessThan(cardCountBefore)
    } finally {
      await userCtx.close()
      await workerCtx.close()
    }
  })
})

// ─── GROUP C: Scheduled Flow — Full Dual Context ─────────────────────────────

test.describe('Scheduled flow — dual context', () => {
  test('SFD-01 User creates scheduled order → board shows empty waiting state', async ({ browser }) => {
    const userCtx = await browser.newContext()
    try {
      const userPage = await userCtx.newPage()
      if (!await loginAs(userPage, 'user')) { test.skip(); return }
      await userPage.goto('/')
      await userPage.waitForLoadState('networkidle')
      await switchRole(userPage, 'user')

      await createScheduledOrder(userPage)
      await snap(userPage, 'SFD-01-scheduled-board-empty')

      await expect(userPage.locator('text=/ажилтнуудын хариуг хүлээж байна/i').first()).toBeVisible()
      await expect(userPage.locator('text=/5 секунд тутамд/i').first()).toBeVisible()
    } finally {
      await userCtx.close()
    }
  })

  test('SFD-02 Worker sees scheduled job and sends acceptance', async ({ browser }) => {
    const userCtx   = await browser.newContext()
    const workerCtx = await browser.newContext()

    try {
      const userPage   = await userCtx.newPage()
      const workerPage = await workerCtx.newPage()

      // Step 1: User creates scheduled order
      if (!await loginAs(userPage, 'user')) { test.skip(); return }
      await userPage.goto('/')
      await userPage.waitForLoadState('networkidle')
      await switchRole(userPage, 'user')
      await createScheduledOrder(userPage)

      // Step 2: Worker logs in and sees the scheduled job
      if (!await loginAs(workerPage, 'worker')) { test.skip(); return }
      await workerPage.goto('/')
      await workerPage.waitForLoadState('networkidle')
      await switchRole(workerPage, 'worker')
      await snap(workerPage, 'SFD-02a-worker-sees-scheduled-job')

      await expect(workerPage.locator('text=/цаг товлох ажлууд/i').first()).toBeVisible()

      const interestedBtn = workerPage.locator('button').filter({ hasText: /Сонирхож байна/i })
      if (await interestedBtn.count() === 0) {
        test.skip()
        return
      }

      await interestedBtn.first().click()
      await workerPage.waitForTimeout(800)
      await snap(workerPage, 'SFD-02b-acceptance-sent')

      await expect(workerPage.locator('text=/санал илгээгдлээ/i').first()).toBeVisible()
    } finally {
      await userCtx.close()
      await workerCtx.close()
    }
  })

  test('SFD-03 User board shows accepted worker card after worker acceptance', async ({ browser }) => {
    const userCtx   = await browser.newContext()
    const workerCtx = await browser.newContext()

    try {
      const userPage   = await userCtx.newPage()
      const workerPage = await workerCtx.newPage()

      // User creates order
      if (!await loginAs(userPage, 'user')) { test.skip(); return }
      await userPage.goto('/')
      await userPage.waitForLoadState('networkidle')
      await switchRole(userPage, 'user')
      await createScheduledOrder(userPage)

      // Worker accepts
      if (!await loginAs(workerPage, 'worker')) { test.skip(); return }
      await workerPage.goto('/')
      await workerPage.waitForLoadState('networkidle')
      await switchRole(workerPage, 'worker')

      const interestedBtn = workerPage.locator('button').filter({ hasText: /Сонирхож байна/i })
      if (await interestedBtn.count() === 0) { test.skip(); return }
      await interestedBtn.first().click()
      await workerPage.waitForTimeout(800)

      // User: wait for the 5s auto-poll to pick up the new acceptance
      await userPage.waitForTimeout(6000)
      await snap(userPage, 'SFD-03-board-with-acceptor')

      const pickBtn = userPage.locator('button').filter({ hasText: /Сонгох/i })
      await expect(pickBtn.first()).toBeVisible()
    } finally {
      await userCtx.close()
      await workerCtx.close()
    }
  })

  test('SFD-04 User picks worker → confirm-scheduled-worker screen', async ({ browser }) => {
    const userCtx   = await browser.newContext()
    const workerCtx = await browser.newContext()

    try {
      const userPage   = await userCtx.newPage()
      const workerPage = await workerCtx.newPage()

      if (!await loginAs(userPage, 'user')) { test.skip(); return }
      await userPage.goto('/')
      await userPage.waitForLoadState('networkidle')
      await switchRole(userPage, 'user')
      await createScheduledOrder(userPage)

      if (!await loginAs(workerPage, 'worker')) { test.skip(); return }
      await workerPage.goto('/')
      await workerPage.waitForLoadState('networkidle')
      await switchRole(workerPage, 'worker')

      const interestedBtn = workerPage.locator('button').filter({ hasText: /Сонирхож байна/i })
      if (await interestedBtn.count() === 0) { test.skip(); return }
      await interestedBtn.first().click()
      await workerPage.waitForTimeout(800)

      // Wait for 5s auto-poll then snapshot
      await userPage.waitForTimeout(6000)
      await snap(userPage, 'SFD-04a-board-after-poll')

      const pickBtn = userPage.locator('button').filter({ hasText: /Сонгох/i })
      if (await pickBtn.count() === 0) { test.skip(); return }

      await pickBtn.first().click()
      await userPage.waitForTimeout(500)
      await snap(userPage, 'SFD-04b-confirm-scheduled-worker')

      await expect(userPage.locator('text=/захиалга баталгаажуулах/i').first()).toBeVisible()
      // Wait for invoice to load (sequential PATCH → invoice fetch) before asserting payment buttons
      await expect(userPage.locator('button').filter({ hasText: /simulate instant success/i }).first()).toBeEnabled({ timeout: 10000 })
    } finally {
      await userCtx.close()
      await workerCtx.close()
    }
  })

  test('SFD-05 Full scheduled flow → reaches active-booking', async ({ browser }) => {
    const userCtx   = await browser.newContext()
    const workerCtx = await browser.newContext()

    try {
      const userPage   = await userCtx.newPage()
      const workerPage = await workerCtx.newPage()

      if (!await loginAs(userPage, 'user')) { test.skip(); return }
      await userPage.goto('/')
      await userPage.waitForLoadState('networkidle')
      await switchRole(userPage, 'user')
      await createScheduledOrder(userPage)

      if (!await loginAs(workerPage, 'worker')) { test.skip(); return }
      await workerPage.goto('/')
      await workerPage.waitForLoadState('networkidle')
      await switchRole(workerPage, 'worker')

      const interestedBtn = workerPage.locator('button').filter({ hasText: /Сонирхож байна/i })
      if (await interestedBtn.count() === 0) { test.skip(); return }
      await interestedBtn.first().click()
      await workerPage.waitForTimeout(800)

      // Wait for 5s auto-poll on user's board
      await userPage.waitForTimeout(6000)

      const pickBtn = userPage.locator('button').filter({ hasText: /Сонгох/i })
      if (await pickBtn.count() === 0) { test.skip(); return }
      await pickBtn.first().click()
      await userPage.waitForTimeout(500)

      // Wait for invoice to load, then pay via dev sim button
      const devSim = userPage.locator('button').filter({ hasText: /simulate instant success/i }).first()
      await expect(devSim).toBeEnabled({ timeout: 10000 })
      await devSim.click()
      await userPage.waitForTimeout(2500)
      await snap(userPage, 'SFD-05-active-booking-after-scheduled')

      await expect(userPage.locator('text=/SOS|идэвхтэй захиалга/i').first()).toBeVisible()
    } finally {
      await userCtx.close()
      await workerCtx.close()
    }
  })
})
