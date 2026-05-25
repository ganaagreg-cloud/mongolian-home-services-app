// @ts-check
const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')

const SS = (name) => path.join('screenshots', `${name}.png`)
const snap = (page, name) => page.screenshot({ path: SS(name), fullPage: true })

// ─── 1. LOGIN PAGE ────────────────────────────────────────────────────────────
test('1. Login page renders', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await snap(page, '01-login')

  await expect(page.locator('input[type="email"], input[placeholder*="name@"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
  await expect(page.locator('button').filter({ hasText: /нэвтрэх/i })).toBeVisible()
  await expect(page.locator('button').filter({ hasText: /бүртгүүлэх/i })).toBeVisible()
})

// ─── 2. LOGIN FORM VALIDATION ────────────────────────────────────────────────
test('2. Login – empty submit shows error', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Click login with empty fields
  await page.locator('button').filter({ hasText: /нэвтрэх/i }).click()
  await page.waitForTimeout(1500)
  await snap(page, '02-login-empty-error')
})

// ─── 3. LOGIN FORM VALIDATION – wrong credentials ───────────────────────────
test('3. Login – wrong credentials shows error toast', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.fill('input[type="email"], input[placeholder*="name@"]', 'wrong@example.com')
  await page.fill('input[type="password"]', 'wrongpassword')
  await page.locator('button').filter({ hasText: /нэвтрэх/i }).click()
  await page.waitForTimeout(2000)
  await snap(page, '03-login-wrong-creds')
})

// ─── 4. REGISTER PAGE ────────────────────────────────────────────────────────
test('4. Register page renders', async ({ page }) => {
  await page.goto('/register')
  await page.waitForLoadState('networkidle')
  await snap(page, '04-register')

  await expect(page.locator('text=/бүртгүүлэх/i').first()).toBeVisible()
  // Name, surname, email, phone, password, confirm fields
  const inputs = page.locator('input')
  await expect(inputs).toHaveCount(6)
})

// ─── 5. REGISTER FORM VALIDATION ─────────────────────────────────────────────
test('5. Register – empty submit shows validation', async ({ page }) => {
  await page.goto('/register')
  await page.waitForLoadState('networkidle')

  await page.locator('button[type="submit"], button').filter({ hasText: /бүртгүүлэх/i }).last().click()
  await page.waitForTimeout(1500)
  await snap(page, '05-register-empty-error')
})

// ─── 6. REGISTER BACK BUTTON ──────────────────────────────────────────────────
test('6. Register back arrow → navigates to login', async ({ page }) => {
  await page.goto('/register')
  await page.waitForLoadState('networkidle')

  await page.locator('button').first().click() // back arrow
  await page.waitForURL('**/login')
  await snap(page, '06-register-back-to-login')
  await expect(page).toHaveURL(/\/login/)
})

// ─── 7. OTP PAGE ──────────────────────────────────────────────────────────────
test('7. OTP page renders with masked phone', async ({ page }) => {
  await page.goto('/otp?phone=99001234')
  await page.waitForLoadState('networkidle')
  await snap(page, '07-otp')

  await expect(page.locator('text=/баталгаажуулах/i').first()).toBeVisible()
  await expect(page.locator('text=/99/i')).toBeVisible() // partial phone shown
})

// ─── 8. OTP WRONG CODE ────────────────────────────────────────────────────────
test('8. OTP – wrong code shows error', async ({ page }) => {
  await page.goto('/otp?phone=99001234')
  await page.waitForLoadState('networkidle')

  // Fill 6 OTP boxes
  const otpInputs = page.locator('input[maxlength="1"], input[type="tel"]')
  const count = await otpInputs.count()
  if (count >= 6) {
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(String(i + 1))
    }
  } else {
    // single input for OTP
    await page.locator('input').first().fill('123456')
  }

  await page.locator('button').filter({ hasText: /баталгаажуулах/i }).click()
  await page.waitForTimeout(2000)
  await snap(page, '08-otp-wrong-code')
})

// ─── 9. REGISTER → LOGIN LINK ─────────────────────────────────────────────────
test('9. Login – register button navigates to /register', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.locator('button').filter({ hasText: /бүртгүүлэх/i }).click()
  await page.waitForURL('**/register')
  await snap(page, '09-login-to-register')
  await expect(page).toHaveURL(/\/register/)
})
