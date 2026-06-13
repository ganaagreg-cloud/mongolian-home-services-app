import type { NotificationType, NotificationMeta } from '@homeservices/shared'
import { db } from '../db'

// Discriminated union for type-safe rendering — narrowing `type` narrows `metadata`
type NotificationInput = {
  [T in NotificationType]: { type: T; metadata: NotificationMeta[T] }
}[NotificationType]

export function renderNotification(input: NotificationInput): { title: string; body: string } {
  switch (input.type) {
    case 'order_accepted':
      return {
        title: 'Захиалга баталгаажлаа',
        body: `${input.metadata.workerName} таны захиалгыг хүлээн авлаа`,
      }
    case 'worker_on_the_way':
      return {
        title: 'Ажилтан явж байна',
        body: `${input.metadata.workerName} замдаа гарлаа`,
      }
    case 'order_completed':
      return { title: 'Захиалга дууслаа', body: 'Үйлчилгээ амжилттай дууслаа' }
    case 'order_cancelled':
      return {
        title: 'Захиалга цуцлагдлаа',
        body: input.metadata.cancelledBy === 'user'
          ? 'Та захиалгыг цуцаллаа'
          : 'Ажилтан захиалгыг цуцаллаа',
      }
    case 'payment_confirmed':
      return {
        title: 'Төлбөр баталгаажлаа',
        body: `₮${input.metadata.amount.toLocaleString()} амжилттай төлөгдлөө`,
      }
    case 'admin_broadcast':
      return { title: 'Мэдэгдэл', body: input.metadata.message }
    default: {
      const _exhaustive: never = input
      void _exhaustive
      return { title: 'Мэдэгдэл', body: '' }
    }
  }
}

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send'

// Fire-and-forget call to Expo's push service. Never throws — callers in
// notify() already wrap this in their own try/catch, but a second layer
// here keeps a malformed token from ever surfacing.
async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ to: token, title, body, data, sound: 'default' }),
  })
}

// notify() is best-effort: catches all errors, never throws into the caller.
// Do NOT call inside a payment/escrow DB transaction.
// Do NOT call from /api/sos.
export async function notify<T extends NotificationType>(
  userId: number | string,
  type: T,
  metadata: NotificationMeta[T],
): Promise<void> {
  try {
    await db.query(
      'INSERT INTO notifications (user_id, type, metadata) VALUES ($1, $2, $3)',
      [Number(userId), type, JSON.stringify(metadata)],
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`[notify] failed type=${type}`, { message })
  }

  // Native push — best-effort, separate failure domain from the DB insert above.
  try {
    const row = (await db.query<{ expo_push_token: string | null }>(
      'SELECT expo_push_token FROM users WHERE id = $1',
      [Number(userId)],
    )).rows[0]
    if (!row?.expo_push_token) return

    const input = { type, metadata } as unknown as NotificationInput
    const { title, body } = renderNotification(input)
    const orderId = input.type === 'admin_broadcast' ? undefined : input.metadata.orderId

    await sendExpoPush(row.expo_push_token, title, body, { type: input.type, orderId })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`[notify] push failed type=${type}`, { message })
  }
}
