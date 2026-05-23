// TODO: replace with real DAN OAuth call when credentials are available.
// Docs: https://dan.gov.mn/api (requires DAN_CLIENT_ID + DAN_CLIENT_SECRET)

export interface DANResult {
  success: boolean
  registerNumber?: string  // е.g. "АА12345678"
  fullName?: string
  error?: string
}

export async function mockDANVerification(_phone: string): Promise<DANResult> {
  await delay(1500 + Math.random() * 1500)

  if (Math.random() < 0.1) {
    return { success: false, error: 'ДАН системтэй холбогдоход алдаа гарлаа. Дахин оролдоно уу.' }
  }

  return {
    success: true,
    registerNumber: 'АА' + String(Math.floor(10_000_000 + Math.random() * 90_000_000)),
    fullName: 'БАТ ДОРЖ',
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
