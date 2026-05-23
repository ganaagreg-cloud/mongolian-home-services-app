// TODO: replace with QPay / SocialPay SDK calls.
// QPay: QPAY_API_KEY env var.  SocialPay: SOCIALPAY_API_KEY env var.

export type PaymentProvider = 'qpay' | 'socialpay'

export interface PaymentResult {
  success: boolean
  transactionId?: string
  error?: string
}

export async function mockPayment(
  provider: PaymentProvider,
  amountMNT: number,
  orderId: string,
): Promise<PaymentResult> {
  await delay(1000 + Math.random() * 2000)

  if (Math.random() < 0.08) {
    return { success: false, error: 'Төлбөр гүйцэтгэхэд алдаа гарлаа. Дахин оролдоно уу.' }
  }

  console.log(`[MOCK ${provider.toUpperCase()}] ₮${amountMNT} for order ${orderId}`)

  return {
    success: true,
    transactionId: `${provider}-${orderId}-${Date.now()}`,
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
