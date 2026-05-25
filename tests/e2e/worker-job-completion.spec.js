// @ts-check
const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')

const SS = path.join(process.cwd(), 'screenshots')
const ss = (name) => path.join(SS, name)

// Minimal valid JPEG (1×1 pixel) for photo upload tests
function makeFakeImage(filePath) {
  const bytes = Buffer.from([
    0xff,0xd8,0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46,0x00,0x01,
    0x01,0x00,0x00,0x01,0x00,0x01,0x00,0x00,0xff,0xdb,0x00,0x43,
    0x00,0x08,0x06,0x06,0x07,0x06,0x05,0x08,0x07,0x07,0x07,0x09,
    0x09,0x08,0x0a,0x0c,0x14,0x0d,0x0c,0x0b,0x0b,0x0c,0x19,0x12,
    0x13,0x0f,0x14,0x1d,0x1a,0x1f,0x1e,0x1d,0x1a,0x1c,0x1c,0x20,
    0x24,0x2e,0x27,0x20,0x22,0x2c,0x23,0x1c,0x1c,0x28,0x37,0x29,
    0x2c,0x30,0x31,0x34,0x34,0x34,0x1f,0x27,0x39,0x3d,0x38,0x32,
    0x3c,0x2e,0x33,0x34,0x32,0xff,0xd9,
  ])
  fs.writeFileSync(filePath, bytes)
}

// worker_id → phone lookup for seed workers
const WORKER_PHONES = {
  '1': '99112233',
  '2': '99224455',
  '3': '99336677',
  '5': '99550011',
  '6': '99661122',
  '8': '99883344',
}

// ── shared state across steps ─────────────────────────────────────────────────
let orderId
let workerPhone

test.describe('Worker job completion flow', () => {

  // ── SETUP: create order + match worker via API ───────────────────────────
  test.beforeAll(async ({ request }) => {
    fs.mkdirSync(SS, { recursive: true })

    // Login as test user
    const loginRes = await request.post('/api/auth/test-login', { data: { role: 'user' } })
    expect(loginRes.ok()).toBeTruthy()

    // Create instant order
    const createRes = await request.post('/api/orders', {
      data: {
        service: 'Цэвэрлэгээ',
        address: 'Улаанбаатар, Чингэлтэй дүүрэг, 5-р хороо',
        scheduledDate: new Date(Date.now() + 3_600_000).toISOString(),
        hours: 2,
        totalAmount: 50000,
        matchingStrategy: 'instant',
      },
    })
    const created = await createRes.json()
    orderId = created.data.id
    console.log('✓ Created order:', orderId)

    // Match a worker
    const matchRes = await request.post(`/api/orders/${orderId}/match`)
    const matched = await matchRes.json()
    const workerId = matched.data?.worker?.workerId
    workerPhone = WORKER_PHONES[workerId] ?? '99112233'
    console.log(`✓ Matched worker: ${matched.data?.worker?.name} (id=${workerId}, phone=${workerPhone})`)
  })

  // ── TEST: full flow in the browser ───────────────────────────────────────
  test('worker sees job, accepts, progresses through statuses, completes', async ({ browser }) => {
    const fakePhoto = path.join(SS, 'test-photo.jpg')
    makeFakeImage(fakePhoto)

    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()

    // ── 1. Open app ──────────────────────────────────────────────────────
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    await page.screenshot({ path: ss('01-login-screen.png') })

    // ── 2. Switch to phone tab ───────────────────────────────────────────
    await page.click('button:has-text("Утасны дугаар")')
    await page.waitForTimeout(300)
    await page.screenshot({ path: ss('02-phone-tab.png') })

    // ── 3. Enter phone number ────────────────────────────────────────────
    const phoneInput = page.locator('input[type="tel"], input[inputmode="numeric"]').first()
    await phoneInput.fill(workerPhone)
    await page.screenshot({ path: ss('03-phone-entered.png') })

    // ── 4. Request OTP ───────────────────────────────────────────────────
    await page.click('button:has-text("OTP авах")')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: ss('04-otp-screen.png') })

    // ── 5. Enter OTP (123456) ────────────────────────────────────────────
    // InputOTP (shadcn) uses a single hidden input under the slot divs.
    // Click the first slot to focus, then type digits via keyboard.
    await page.locator('[data-input-otp]').first().click()
    await page.keyboard.type('123456')
    await page.waitForTimeout(300)
    await page.screenshot({ path: ss('05-otp-entered.png') })

    // ── 6. Submit OTP ────────────────────────────────────────────────────
    await page.click('button:has-text("Баталгаажуулах")')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: ss('06-after-login.png') })

    // ── 7. Navigate to jobs board (bottom nav) ───────────────────────────
    // Worker bottom nav: look for the jobs tab
    const jobsNavItem = page.locator('text=Ажил').first()
    if (await jobsNavItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await jobsNavItem.click()
      await page.waitForTimeout(800)
    }
    await page.screenshot({ path: ss('07-jobs-board.png') })

    // ── 8. Accept the instant job ────────────────────────────────────────
    const acceptBtn = page.locator('button:has-text("Авах")').first()
    await expect(acceptBtn).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: ss('08-instant-job-visible.png') })
    await acceptBtn.click()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: ss('09-worker-active-screen.png') })

    // ── 9. Click "Замдаа явж байна" (on the way) ────────────────────────
    const onTheWayBtn = page.locator('button:has-text("Замдаа явж байна")')
    await expect(onTheWayBtn).toBeVisible({ timeout: 8000 })
    await onTheWayBtn.click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: ss('10-on-the-way.png') })

    // ── 10. Upload before photo ──────────────────────────────────────────
    const fileInputs = page.locator('input[type="file"]')
    await expect(fileInputs.first()).toBeAttached({ timeout: 6000 })
    await fileInputs.first().setInputFiles(fakePhoto)
    await page.waitForTimeout(2500)
    await page.screenshot({ path: ss('11-before-photo-uploaded.png') })

    // ── 11. Click "Ажил эхлэх" (start work) ─────────────────────────────
    const startBtn = page.locator('button:has-text("Ажил эхлэх")')
    await expect(startBtn).toBeEnabled({ timeout: 8000 })
    await startBtn.click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: ss('12-in-progress.png') })

    // ── 12. Upload after photo ───────────────────────────────────────────
    // After "Ажил эхлэх" the before-photo input is gone (replaced by the image),
    // so only the after-photo input remains — use first()
    const afterInput = page.locator('input[type="file"]').first()
    await expect(afterInput).toBeAttached({ timeout: 6000 })
    await afterInput.setInputFiles(fakePhoto)
    await page.waitForTimeout(2500)
    await page.screenshot({ path: ss('13-after-photo-uploaded.png') })

    // ── 13. Click "Ажил дуусгах" (complete) ─────────────────────────────
    const completeBtn = page.locator('button:has-text("Ажил дуусгах")')
    await expect(completeBtn).toBeEnabled({ timeout: 8000 })
    await page.screenshot({ path: ss('14-ready-to-complete.png') })
    // Fire via JS to bypass fixed nav z-index overlap
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent?.trim() === 'Ажил дуусгах')
      btn?.click()
    })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: ss('15-after-complete.png') })

    // ── 14. Verify: back on jobs board ───────────────────────────────────
    await expect(page.locator('text=Ажлын самбар')).toBeVisible({ timeout: 8000 })
    await page.screenshot({ path: ss('16-back-on-jobs-board.png') })
    console.log('✓ Worker returned to jobs board after completion')

    // ── 15. Verify: order status is "completed" in DB ────────────────────
    const statusRes = await page.request.get(`/api/orders/${orderId}`)
    const statusJson = await statusRes.json()
    console.log('✓ Final order status:', statusJson.data?.status)
    expect(statusJson.data?.status).toBe('completed')

    await ctx.close()
  })
})
