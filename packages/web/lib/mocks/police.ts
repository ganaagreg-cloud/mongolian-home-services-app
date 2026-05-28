// TODO: replace with real National Police Agency API call.
// Requires a signed data-sharing agreement with the MNP.

export interface PoliceCheckResult {
  success: boolean
  hasCriminalRecord?: boolean
  error?: string
}

export async function mockPoliceCheck(_registerNumber: string): Promise<PoliceCheckResult> {
  await delay(2000 + Math.random() * 1000)

  if (Math.random() < 0.05) {
    return { success: false, error: 'Цагдаагийн системтэй холбогдоход алдаа гарлаа.' }
  }

  return { success: true, hasCriminalRecord: false }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
