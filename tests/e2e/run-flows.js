// @ts-check
const playwright = require('C:/Users/1021016945/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright')
const path = require('path')
const fs = require('fs')

const SS_DIR = path.join(__dirname, '../../screenshots')
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true })

const snap = async (page, name) => {
  const file = path.join(SS_DIR, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  console.log(`  📸 ${name}.png`)
}

const BASE = 'http://localhost:3000'

;(async () => {
  const browser = await playwright.chromium.launch({ headless: true })
  const results = []

  const run = async (label, fn) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    try {
      await fn(page, ctx)
      results.push({ label, status: 'PASS' })
      console.log(`✅ ${label}`)
    } catch (err) {
      results.push({ label, status: 'FAIL', error: err.message })
      console.log(`❌ ${label}: ${err.message}`)
      await snap(page, `FAIL-${label.replace(/\s+/g,'_')}`)
    } finally {
      await ctx.close()
    }
  }

  // ── 1. LOGIN PAGE ──────────────────────────────────────────────────────────
  await run('01 Login page renders', async (page) => {
    await page.goto(`${BASE}/login`)
    await page.waitForLoadState('networkidle')
    await snap(page, '01-login')
    const emailInput = await page.$('input[type="email"], input[placeholder*="name@"], input[placeholder*="Цахим"]')
    if (!emailInput) throw new Error('Email input not found')
    const pwInput = await page.$('input[type="password"]')
    if (!pwInput) throw new Error('Password input not found')
  })

  // ── 2. LOGIN FORM – empty submit ───────────────────────────────────────────
  await run('02 Login empty submit', async (page) => {
    await page.goto(`${BASE}/login`)
    await page.waitForLoadState('networkidle')
    // Click the primary login button
    const loginBtn = page.locator('button').filter({ hasText: /нэвтрэх/i })
    await loginBtn.click()
    await page.waitForTimeout(1800)
    await snap(page, '02-login-empty-submit')
  })

  // ── 3. LOGIN FORM – wrong credentials ──────────────────────────────────────
  await run('03 Login wrong credentials', async (page) => {
    await page.goto(`${BASE}/login`)
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"], input[placeholder*="name@"]', 'nobody@test.com')
    await page.fill('input[type="password"]', 'wrongpass1')
    await page.locator('button').filter({ hasText: /нэвтрэх/i }).click()
    await page.waitForTimeout(2500)
    await snap(page, '03-login-wrong-creds')
    // Should show error banner
    const error = await page.$('.text-destructive, [class*="destructive"]')
    if (!error) throw new Error('No error message shown for wrong credentials')
  })

  // ── 4. LOGIN → REGISTER navigation ─────────────────────────────────────────
  await run('04 Login → Register navigation', async (page) => {
    await page.goto(`${BASE}/login`)
    await page.waitForLoadState('networkidle')
    await page.locator('button').filter({ hasText: /бүртгүүлэх/i }).click()
    await page.waitForURL(`${BASE}/register`, { timeout: 5000 })
    await snap(page, '04-login-to-register')
  })

  // ── 5. REGISTER PAGE renders ────────────────────────────────────────────────
  await run('05 Register page renders', async (page) => {
    await page.goto(`${BASE}/register`)
    await page.waitForLoadState('networkidle')
    await snap(page, '05-register')
    const inputs = await page.$$('input')
    if (inputs.length < 4) throw new Error(`Expected ≥4 inputs, got ${inputs.length}`)
  })

  // ── 6. REGISTER FORM – empty submit ─────────────────────────────────────────
  await run('06 Register empty submit', async (page) => {
    await page.goto(`${BASE}/register`)
    await page.waitForLoadState('networkidle')
    const submitBtn = page.locator('button').filter({ hasText: /бүртгүүлэх/i }).last()
    await submitBtn.click()
    await page.waitForTimeout(1500)
    await snap(page, '06-register-empty-submit')
  })

  // ── 7. REGISTER FORM – password mismatch ────────────────────────────────────
  await run('07 Register password mismatch', async (page) => {
    await page.goto(`${BASE}/register`)
    await page.waitForLoadState('networkidle')
    const inputs = await page.$$('input')
    if (inputs[0]) await inputs[0].fill('Бат')         // First name
    if (inputs[1]) await inputs[1].fill('Дорж')        // Last name
    if (inputs[2]) await inputs[2].fill('bat@test.mn') // Email
    if (inputs[4]) await inputs[4].fill('password123') // Password
    if (inputs[5]) await inputs[5].fill('different!')  // Confirm password
    await page.locator('button').filter({ hasText: /бүртгүүлэх/i }).last().click()
    await page.waitForTimeout(1500)
    await snap(page, '07-register-password-mismatch')
  })

  // ── 8. REGISTER BACK → LOGIN ─────────────────────────────────────────────────
  await run('08 Register back → login', async (page) => {
    await page.goto(`${BASE}/register`)
    await page.waitForLoadState('networkidle')
    await page.locator('button').first().click()
    await page.waitForURL(`${BASE}/login`, { timeout: 5000 })
    await snap(page, '08-register-back-login')
  })

  // ── 9. OTP PAGE renders ──────────────────────────────────────────────────────
  await run('09 OTP page renders', async (page) => {
    await page.goto(`${BASE}/otp?phone=99001234`)
    await page.waitForLoadState('networkidle')
    await snap(page, '09-otp')
    const heading = await page.$('text=/баталгаажуулах/i')
    if (!heading) throw new Error('OTP heading not found')
  })

  // ── 10. OTP wrong code ───────────────────────────────────────────────────────
  await run('10 OTP wrong code shows error', async (page) => {
    await page.goto(`${BASE}/otp?phone=99001234`)
    await page.waitForLoadState('networkidle')
    // Try typing into OTP slots (InputOTP)
    const otpInputs = await page.$$('input[maxlength="1"]')
    if (otpInputs.length === 6) {
      for (let i = 0; i < 6; i++) await otpInputs[i].fill(String(i + 1))
    } else {
      const singleInput = await page.$('input')
      if (singleInput) await singleInput.fill('123456')
    }
    await page.locator('button').filter({ hasText: /баталгаажуулах/i }).click()
    await page.waitForTimeout(2500)
    await snap(page, '10-otp-wrong-code')
    const error = await page.$('.text-destructive, [class*="destructive"]')
    if (!error) throw new Error('No error for wrong OTP')
  })

  // ── 11. OTP back → login ─────────────────────────────────────────────────────
  await run('11 OTP back → login', async (page) => {
    await page.goto(`${BASE}/otp?phone=99001234`)
    await page.waitForLoadState('networkidle')
    await page.locator('button').first().click()
    await page.waitForURL(`${BASE}/login`, { timeout: 5000 })
    await snap(page, '11-otp-back-login')
  })

  // ── 12. ONBOARDING slides ────────────────────────────────────────────────────
  await run('12 Onboarding slides progress', async (page) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await snap(page, '12-onboarding-1')
    const continueBtn = page.locator('button').filter({ hasText: /үргэлжлүүлэх/i })
    if (await continueBtn.isVisible()) {
      await continueBtn.click()
      await page.waitForTimeout(400)
      await snap(page, '12b-onboarding-2')
      await continueBtn.click()
      await page.waitForTimeout(400)
      await snap(page, '12c-onboarding-3')
      // Last slide should have a "get started" or redirect to login
      await page.waitForTimeout(600)
      await snap(page, '12d-onboarding-end')
    } else {
      throw new Error('Continue button not found on onboarding')
    }
  })

  // ── 13. ONBOARDING skip ──────────────────────────────────────────────────────
  await run('13 Onboarding skip', async (page) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    const skipBtn = page.locator('button').filter({ hasText: /алгасах/i })
    if (await skipBtn.isVisible()) {
      await skipBtn.click()
      await page.waitForTimeout(800)
      await snap(page, '13-onboarding-skip')
    } else {
      throw new Error('Skip button not visible on onboarding')
    }
  })

  await browser.close()

  // ── SUMMARY ──────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════')
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  console.log(`TOTAL: ${passed} passed, ${failed} failed out of ${results.length}`)
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  ❌ ${r.label}: ${r.error}`)
  })
  process.exit(failed > 0 ? 1 : 0)
})()
