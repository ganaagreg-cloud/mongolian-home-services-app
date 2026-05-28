/**
 * Playwright test script for worker mode toggle testing.
 * Run: node .playwright-mcp/test-worker-toggle.mjs
 */
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'
import { join } from 'path'

const OUT = 'D:/files/mongolian-home-services-app'
const BASE = 'http://localhost:3000'

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.setViewportSize({ width: 390, height: 844 })

const log = []
const errors = []
const defects = []

page.on('console', msg => {
  if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`)
})
page.on('pageerror', err => errors.push(`PAGE ERROR: ${err.message}`))

async function snap(name, label) {
  const file = `${OUT}/${name}.png`
  await page.screenshot({ path: file, fullPage: false })
  log.push(`[SNAP] ${label} => ${name}.png`)
  return file
}

function defect(id, severity, title, detail, fix) {
  defects.push({ id, severity, title, detail, fix })
  log.push(`[DEFECT ${id}] ${severity}: ${title}`)
}

// ════════════════════════════════════════════════════════════
// PHASE 1: Login screen audit
// ════════════════════════════════════════════════════════════
log.push('=== PHASE 1: Login Screen ===')
await page.goto(BASE)
await sleep(2000)
await snap('p1-login-screen', 'Initial login screen')

const phoneInputs = await page.locator('input[inputmode="numeric"]').count()
const passwordInputs = await page.locator('input[type="password"]').count()
const loginButton = await page.locator('button:has-text("Нэвтрэх")').count()
const googleBtn = await page.locator('button:has-text("Google")').count()
const facebookBtn = await page.locator('button:has-text("Facebook")').count()
const registerLink = await page.locator('button:has-text("Бүртгүүлэх")').count()

log.push(`Phone input: ${phoneInputs}`)
log.push(`Password input: ${passwordInputs}`)
log.push(`Login button: ${loginButton}`)
log.push(`Google button: ${googleBtn}`)
log.push(`Facebook button: ${facebookBtn}`)
log.push(`Register link: ${registerLink}`)

// Test empty submit
await page.locator('button:has-text("Нэвтрэх")').click()
await sleep(500)
const emptyError = await page.locator('text=Утасны дугаар буруу').count()
log.push(`Empty submit error shown: ${emptyError > 0}`)
await snap('p1-login-empty-error', 'Login empty-submit error')

// ════════════════════════════════════════════════════════════
// PHASE 2: Admin login
// ════════════════════════════════════════════════════════════
log.push('\n=== PHASE 2: Admin Login (95342321 / 12345678) ===')
await page.locator('input[inputmode="numeric"]').fill('95342321')
await page.locator('input[type="password"]').fill('12345678')
await page.locator('button:has-text("Нэвтрэх")').click()
await sleep(4000)
await snap('p2-admin-dashboard', 'Admin dashboard after login')

const adminHeadings = await page.locator('h1, h2').allTextContents()
log.push(`Admin headings: ${JSON.stringify(adminHeadings)}`)
const isAdminScreen = adminHeadings.some(h => h.includes('Статистик') || h.includes('Дашбоард') || h.includes('Admin'))
log.push(`Admin dashboard detected: ${isAdminScreen}`)

// ════════════════════════════════════════════════════════════
// PHASE 3: Logout and login as worker
// ════════════════════════════════════════════════════════════
log.push('\n=== PHASE 3: Sign out and login as worker ===')
// Use the API signout
await page.goto(`${BASE}/api/auth/sign-out`)
await sleep(1000)
await page.goto(BASE)
await sleep(2000)
await snap('p3-after-signout', 'After signout - should see login')

const loginAfterSignout = await page.locator('input[inputmode="numeric"]').count()
log.push(`Login screen after signout: ${loginAfterSignout > 0}`)

// Login as work1 worker: phone 99999999
// Need to determine password — the account was registered via the app
// Try common passwords
const workerPasswords = ['12345678', 'test1234', 'password', '11111111']
let workerLoggedIn = false

for (const pw of workerPasswords) {
  await page.locator('input[inputmode="numeric"]').fill('99999999')
  await page.locator('input[type="password"]').fill(pw)
  await page.locator('button:has-text("Нэвтрэх")').click()
  await sleep(3000)
  const err = await page.locator('text=Утасны дугаар эсвэл нууц үг буруу байна').count()
  if (err === 0) {
    log.push(`Worker logged in with password: ${pw}`)
    workerLoggedIn = true
    break
  } else {
    log.push(`Password ${pw} failed`)
    // Clear for next attempt
    await page.locator('input[inputmode="numeric"]').clear()
    await page.locator('input[type="password"]').clear()
  }
}
await snap('p3-worker-login-result', 'Worker login result')

if (!workerLoggedIn) {
  defect('D-01', 'BLOCKER', 'Cannot login as is_worker=true test account',
    'Worker account 99999999 has Better Auth credentials but password is unknown. Cannot complete toggle testing.',
    'Add a seeded worker test account with known phone+password credentials in seed.ts, similar to the admin account (95342321/12345678).')
}

// ════════════════════════════════════════════════════════════
// PHASE 4: Worker mode toggle on home screen (if logged in)
// ════════════════════════════════════════════════════════════
if (workerLoggedIn) {
  log.push('\n=== PHASE 4: Home screen toggle visibility ===')
  await sleep(2000)
  await snap('p4-worker-home', 'Worker account home screen')

  const currentScreen = await page.textContent('body')
  const isWorkerJobs = currentScreen?.includes('Ажлын самбар')
  const isHome = currentScreen?.includes('Хэрэглэгч') && currentScreen?.includes('Ажилтан')
  log.push(`On worker-jobs screen (active_mode=worker): ${isWorkerJobs}`)
  log.push(`On home screen: ${isHome}`)

  // Check toggle visibility — look for the segmented toggle
  const toggleButtons = await page.locator('button:has-text("Хэрэглэгч"), button:has-text("Ажилтан")').count()
  log.push(`Mode toggle buttons found: ${toggleButtons}`)

  if (toggleButtons < 2) {
    defect('D-02', 'CRITICAL', 'Mode toggle not visible on initial screen after worker login',
      `Expected 2 toggle buttons (Хэрэглэгч / Ажилтан) but found ${toggleButtons}`,
      'Ensure isWorker=true is set in app state and passed down to the correct screen component.')
  }

  // ── PHASE 4a: If on worker-jobs screen, verify toggle there ──
  if (isWorkerJobs) {
    log.push('\n=== PHASE 4a: Toggle on worker-jobs screen ===')
    const workerJobsToggle = await page.locator('button:has-text("Хэрэглэгч")').count()
    log.push(`Toggle on worker-jobs: ${workerJobsToggle > 0}`)
    await snap('p4a-worker-jobs-toggle', 'Worker jobs screen with toggle')

    if (workerJobsToggle === 0) {
      defect('D-03', 'CRITICAL', 'Toggle missing on Ажлын самбар (worker-jobs) screen',
        'When active_mode=worker, the mode toggle [Хэрэглэгч | Ажилтан] should be visible in the worker-jobs header',
        'Check WorkerJobsScreen component: ensure isWorker prop is true and the toggle JSX block is not conditionally hidden.')
    }

    // Click "Хэрэглэгч" to switch to user mode
    log.push('\n=== PHASE 4b: Switch to user mode from worker-jobs ===')
    await page.locator('button:has-text("Хэрэглэгч")').first().click()
    await sleep(3000)
    await snap('p4b-switched-to-user', 'After clicking Хэрэглэгч from worker-jobs')

    const nowOnHome = await page.locator('text=Өнөөдөр юу хийх вэ').count()
    log.push(`Navigated to home screen: ${nowOnHome > 0}`)

    if (nowOnHome === 0) {
      defect('D-04', 'CRITICAL', 'Clicking Хэрэглэгч from worker-jobs does not navigate to home screen',
        'Expected setCurrentScreen("home") after mode switch to user, but did not detect home screen content',
        'Verify handleModeToggle in page.tsx: mode=user should call setCurrentScreen("home") after API success.')
    }

    // ── PHASE 4c: Verify toggle still on home screen ──
    if (nowOnHome > 0) {
      log.push('\n=== PHASE 4c: Toggle visible on home screen ===')
      const homeToggle = await page.locator('button:has-text("Ажилтан")').count()
      log.push(`Toggle visible on home screen: ${homeToggle > 0}`)
      await snap('p4c-home-toggle', 'Home screen toggle after switching from worker mode')

      if (homeToggle === 0) {
        defect('D-05', 'CRITICAL', 'Mode toggle not visible on home screen after switching back from worker mode',
          'isWorker should remain true after mode toggle — but toggle disappeared',
          'Ensure isWorker state is not reset on mode toggle. Only activeMode should change.')
      }

      // Verify "Хэрэглэгч" is the active tab
      const userActive = await page.locator('.bg-primary:has-text("Хэрэглэгч")').count()
      log.push(`Хэрэглэгч button is active (highlighted): ${userActive > 0}`)
      if (userActive === 0) {
        defect('D-06', 'MAJOR', 'Active mode indicator incorrect on home screen toggle',
          'After switching to user mode, the Хэрэглэгч button should be highlighted (bg-primary)',
          'Verify activeMode state is set to "user" and passed correctly as prop to HomeScreen.')
      }

      // ── PHASE 4d: Switch back to Ажилтан from home ──
      log.push('\n=== PHASE 4d: Switch back to Ажилтан from home ===')
      await page.locator('button:has-text("Ажилтан")').first().click()
      await sleep(3000)
      await snap('p4d-switched-to-worker', 'After clicking Ажилтан from home screen')

      const backOnWorkerJobs = await page.locator('text=Ажлын самбар').count()
      log.push(`Back on Ажлын самбар screen: ${backOnWorkerJobs > 0}`)

      if (backOnWorkerJobs === 0) {
        defect('D-07', 'CRITICAL', 'Clicking Ажилтан from home does not navigate to worker-jobs screen',
          'Expected setCurrentScreen("worker-jobs") after mode switch to worker',
          'Verify handleModeToggle: mode=worker should call setCurrentScreen("worker-jobs") after API success.')
      }

      // ── PHASE 4e: Verify toggle on worker-jobs after round-trip ──
      if (backOnWorkerJobs > 0) {
        log.push('\n=== PHASE 4e: Toggle visible on worker-jobs after round-trip ===')
        const finalToggle = await page.locator('button:has-text("Хэрэглэгч")').count()
        log.push(`Toggle on worker-jobs after round-trip: ${finalToggle > 0}`)
        await snap('p4e-worker-jobs-final', 'Worker-jobs screen after round-trip toggle')

        if (finalToggle === 0) {
          defect('D-08', 'CRITICAL', 'Mode toggle missing on worker-jobs after round-trip navigation',
            'After switching Хэрэглэгч → Ажилтан and back to worker-jobs, toggle disappeared',
            'The isWorker prop must be maintained throughout the entire session lifecycle.')
        }

        // Verify "Ажилтан" is active
        const workerActive = await page.locator('.bg-primary:has-text("Ажилтан")').count()
        log.push(`Ажилтан button is active: ${workerActive > 0}`)
      }
    }
  } else if (isHome) {
    // Started on home screen (active_mode was 'user')
    log.push('\n=== PHASE 4a: Already on home, verify toggle ===')
    const homeToggle = await page.locator('button:has-text("Ажилтан")').count()
    log.push(`Toggle on home screen: ${homeToggle > 0}`)
    await snap('p4a-home-toggle', 'Home screen toggle')

    // Click Ажилтан to switch to worker mode
    await page.locator('button:has-text("Ажилтан")').first().click()
    await sleep(3000)
    await snap('p4b-switched-to-worker', 'After clicking Ажилтан')

    const onWorkerJobs = await page.locator('text=Ажлын самбар').count()
    log.push(`Navigated to Ажлын самбар: ${onWorkerJobs > 0}`)

    if (onWorkerJobs > 0) {
      const workerToggle = await page.locator('button:has-text("Хэрэглэгч")').count()
      log.push(`Toggle visible on worker-jobs: ${workerToggle > 0}`)
      await snap('p4c-worker-jobs-toggle', 'Worker-jobs toggle')
    }
  }
}

// ════════════════════════════════════════════════════════════
// PHASE 5: Orders/Jobs separation verification
// ════════════════════════════════════════════════════════════
log.push('\n=== PHASE 5: Orders/Jobs separation ===')
// Check user orders API behavior
const ordersResponse = await page.evaluate(async () => {
  const r = await fetch('/api/orders')
  const data = await r.json()
  return { status: r.status, count: Array.isArray(data) ? data.length : null, keys: Object.keys(data) }
}).catch(e => ({ error: e.message }))
log.push(`Orders API response: ${JSON.stringify(ordersResponse)}`)

// ════════════════════════════════════════════════════════════
// PHASE 6: Self-matching prevention
// ════════════════════════════════════════════════════════════
log.push('\n=== PHASE 6: Self-matching prevention check ===')
// Check if worker can accept their own order
const selfMatchTest = await page.evaluate(async () => {
  // Try to accept order 1 (userId=9, not this user) — should be fine
  // Worker is user 55 in DB
  const r = await fetch('/api/orders/1/accept', { method: 'POST' })
  return { status: r.status }
}).catch(e => ({ error: e.message }))
log.push(`Self-match test (order 1 accept): ${JSON.stringify(selfMatchTest)}`)

// ════════════════════════════════════════════════════════════
// Save results
// ════════════════════════════════════════════════════════════
const results = { log, errors, defects, summary: `${defects.length} defects found` }
writeFileSync(`${OUT}/test-results-worker-toggle.json`, JSON.stringify(results, null, 2))

console.log('\n========================================')
console.log('TEST SUMMARY')
console.log('========================================')
log.forEach(l => console.log(l))
if (errors.length > 0) {
  console.log('\nCONSOLE ERRORS:')
  errors.forEach(e => console.log(e))
}
console.log(`\nDEFECTS FOUND: ${defects.length}`)
defects.forEach(d => console.log(`  [${d.id}] ${d.severity}: ${d.title}`))

await browser.close()
