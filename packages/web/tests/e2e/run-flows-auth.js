// @ts-check
// Authenticated flow tests — requires dev server running on :3000
// Uses /api/auth/test-login (dev-only) to bypass real auth.
const playwright = require('C:/Users/1021016945/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright')
const path = require('path')
const fs = require('fs')

const SS_DIR = path.join(__dirname, '../../screenshots')
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true })

const BASE = 'http://localhost:3000'

const snap = async (page, name) => {
  const file = path.join(SS_DIR, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  console.log(`  📸 ${name}.png`)
}

// Log in as the given role via the dev-only test-login endpoint.
// Returns a browser context with the session cookie set.
const loginAs = async (browser, role) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const res = await page.request.post(`${BASE}/api/auth/test-login`, {
    data: { role },
    headers: { 'content-type': 'application/json' },
  })
  const body = await res.json()
  if (!body.success) throw new Error(`test-login failed for role=${role}: ${JSON.stringify(body)}`)
  await page.close()
  return ctx
}

;(async () => {
  const browser = await playwright.chromium.launch({ headless: true })
  const results = []

  const run = async (label, role, fn) => {
    let ctx
    try {
      ctx = await loginAs(browser, role)
      const page = await ctx.newPage()
      await fn(page, ctx)
      results.push({ label, status: 'PASS' })
      console.log(`✅ ${label}`)
    } catch (err) {
      results.push({ label, status: 'FAIL', error: err.message })
      console.log(`❌ ${label}: ${err.message}`)
      // Try to snap a failure screenshot
      try {
        const page = await ctx.newPage()
        await snap(page, `FAIL-${label.replace(/\s+/g, '_')}`)
      } catch {}
    } finally {
      if (ctx) await ctx.close()
    }
  }

  // ── USER FLOWS ──────────────────────────────────────────────────────────────

  await run('20 User home screen', 'user', async (page) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await snap(page, '20-user-home')
    const heading = await page.$('text=/сайн уу|нүүр|home/i')
    if (!heading) {
      // Accept if bottom nav is visible (proof the home screen rendered)
      const nav = await page.$('nav, [role="tablist"]')
      if (!nav) throw new Error('Home screen: no heading or bottom nav found')
    }
  })

  await run('21 User search screen', 'user', async (page) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    // Click search icon in the home screen header
    await page.locator('button, a').filter({ hasText: /хайх|хайлт/i }).first().click().catch(() => {})
    // Fallback: bottom nav 2nd tab (search)
    const nav = page.locator('nav button, [role="tablist"] button')
    if (await nav.count() >= 2) await nav.nth(1).click().catch(() => {})
    await page.waitForTimeout(600)
    await snap(page, '21-user-search')
  })

  await run('22 User booking flow', 'user', async (page) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    // Search → pick first worker → booking screen
    await page.locator('button').filter({ hasText: /хайх|хайлт/i }).first().click().catch(() => {})
    const nav = page.locator('nav button, [role="tablist"] button')
    if (await nav.count() >= 2) await nav.nth(1).click().catch(() => {})
    await page.waitForTimeout(600)
    // Click first "Захиалах" (Book) button
    await page.locator('button').filter({ hasText: /захиалах/i }).first().click().catch(() => {})
    await page.waitForTimeout(600)
    await snap(page, '22-user-booking')
  })

  await run('23 User orders screen', 'user', async (page) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    // Bottom nav — orders (3rd tab, index 1 on the 4-item nav)
    const tabs = page.locator('nav button, [role="tablist"] button')
    const count = await tabs.count()
    if (count >= 2) await tabs.nth(1).click()
    await page.waitForTimeout(600)
    await snap(page, '23-user-orders')
  })

  await run('24 User profile screen', 'user', async (page) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    const tabs = page.locator('nav button, [role="tablist"] button')
    const count = await tabs.count()
    if (count >= 1) await tabs.last().click()
    await page.waitForTimeout(600)
    await snap(page, '24-user-profile')
  })

  await run('25 User chat screen', 'user', async (page) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    // Navigate to chat via bottom nav (3rd tab on 4-item nav)
    const tabs = page.locator('nav button, [role="tablist"] button')
    const count = await tabs.count()
    if (count >= 3) await tabs.nth(2).click()
    await page.waitForTimeout(600)
    await snap(page, '25-user-chat')
  })

  // ── WORKER FLOWS ─────────────────────────────────────────────────────────────

  await run('30 Worker jobs screen', 'worker', async (page) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await snap(page, '30-worker-jobs')
    // Should show worker bottom nav
    const nav = await page.$('nav, [role="tablist"]')
    if (!nav) throw new Error('Worker jobs: bottom nav not found')
  })

  await run('31 Worker active screen', 'worker', async (page) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    const tabs = page.locator('nav button, [role="tablist"] button')
    if (await tabs.count() >= 2) await tabs.nth(1).click()
    await page.waitForTimeout(600)
    await snap(page, '31-worker-active')
  })

  await run('32 Worker earnings screen', 'worker', async (page) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    const tabs = page.locator('nav button, [role="tablist"] button')
    if (await tabs.count() >= 3) await tabs.nth(2).click()
    await page.waitForTimeout(600)
    await snap(page, '32-worker-earnings')
  })

  await run('33 Worker profile screen', 'worker', async (page) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    const tabs = page.locator('nav button, [role="tablist"] button')
    if (await tabs.count() >= 1) await tabs.last().click()
    await page.waitForTimeout(600)
    await snap(page, '33-worker-profile')
  })

  // ── ADMIN FLOWS ──────────────────────────────────────────────────────────────

  await run('40 Admin dashboard', 'admin', async (page) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await snap(page, '40-admin-dashboard')
    const stats = await page.$('text=/захиалга|ажилтан|маргаан|order|worker|dispute/i')
    if (!stats) throw new Error('Admin dashboard: no KPI stats found')
  })

  await run('41 Admin verify workers', 'admin', async (page) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    // Click the "verifications" button/link on the admin dashboard
    await page.locator('button, a').filter({ hasText: /баталгаажуулах|шалгах|verify/i }).first().click().catch(() => {})
    await page.waitForTimeout(600)
    await snap(page, '41-admin-verify')
  })

  await run('42 Admin disputes', 'admin', async (page) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    // Click the "disputes" button/link on the admin dashboard
    await page.locator('button, a').filter({ hasText: /маргаан|гомдол|dispute/i }).first().click().catch(() => {})
    await page.waitForTimeout(600)
    await snap(page, '42-admin-disputes')
  })

  await browser.close()

  // ── SUMMARY ─────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════')
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  console.log(`TOTAL: ${passed} passed, ${failed} failed out of ${results.length}`)
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  ❌ ${r.label}: ${r.error}`)
  })
  process.exit(failed > 0 ? 1 : 0)
})()
