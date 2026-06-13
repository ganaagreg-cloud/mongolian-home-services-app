import type { OrderStatus } from '@homeservices/shared'

// Money is always integer MNT
export function formatMnt(amount: number): string {
  return `${Math.floor(amount).toLocaleString('en-US')}₮`
}

// "2026-06-13 09:00" → "2026-06-13 · 09:00"
export function formatSchedule(scheduledDate: string): string {
  return `${scheduledDate.slice(0, 10)} · ${scheduledDate.slice(11, 16)}`
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_acceptances:       'Ажилтнуудын санал хүлээж байна',
  searching_worker:          'Ажилтан хайж байна',
  pending_worker_acceptance: 'Ажилтны хариу хүлээж байна',
  pending_payment:           'Төлбөр хүлээгдэж байна',
  awaiting_payment:          'Төлбөр хүлээгдэж байна',
  worker_assigned:           'Ажилтан баталгаажсан',
  worker_on_the_way:         'Ажилтан замдаа гарсан',
  in_progress:               'Ажил хийгдэж байна',
  completed:                 'Дууссан',
  rated:                     'Үнэлгээ өгсөн',
  cancelled_by_user:         'Цуцалсан',
  cancelled_by_worker:       'Ажилтан цуцалсан',
  no_workers_found:          'Ажилтан олдсонгүй',
  awaiting_quote:            'Үнийн санал хүлээж байна',
  quote_submitted:           'Үнийн санал ирсэн',
  quote_approved:            'Үнийн санал зөвшөөрөгдсөн',
  quote_rejected:            'Үнийн санал татгалзсан',
}

// Statuses where the booking is live (worker engaged) — SOS + chat surface here
export const LIVE_STATUSES: readonly OrderStatus[] = [
  'worker_assigned', 'worker_on_the_way', 'in_progress',
]

// Statuses still in flight from the user's perspective (orders list "active" tab)
export const OPEN_STATUSES: readonly OrderStatus[] = [
  'pending_acceptances', 'searching_worker', 'pending_worker_acceptance',
  'pending_payment', 'awaiting_payment', 'worker_assigned', 'worker_on_the_way',
  'in_progress', 'awaiting_quote', 'quote_submitted',
]

// Statuses the user may cancel from (mirrors FREE_STATUSES + FEE_STATUSES in the API)
export const CANCELLABLE_STATUSES: readonly OrderStatus[] = [
  'pending_acceptances', 'awaiting_payment', 'searching_worker',
  'pending_worker_acceptance', 'pending_payment', 'worker_assigned', 'worker_on_the_way',
]
