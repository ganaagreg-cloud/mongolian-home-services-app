// TODO: replace with a Mongolian SMS gateway (e.g. Mobicom, Unitel bulk SMS API).
// Set FCM_SERVER_KEY or a dedicated SMS_API_KEY env var when ready.

export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function mockSMS(phone: string, message: string): Promise<SMSResult> {
  await delay(700 + Math.random() * 800)

  if (Math.random() < 0.05) {
    return { success: false, error: 'SMS илгээхэд алдаа гарлаа. Дахин оролдоно уу.' }
  }

  // Print OTP to server console so you can use it during dev.
  console.log(`[MOCK SMS] → ${phone}: ${message}`)

  return {
    success: true,
    messageId: `mock-${Date.now()}`,
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
