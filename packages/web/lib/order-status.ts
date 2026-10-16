import { Clock, CheckCircle2, XCircle, AlertCircle, Search, type LucideIcon } from 'lucide-react'
import type { Order, OrderStatus } from '@/lib/types'

export const ACTIVE_STATUSES: OrderStatus[] = [
  'searching_worker', 'pending_acceptances', 'awaiting_payment', 'pending_worker_acceptance', 'worker_assigned', 'worker_on_the_way', 'in_progress',
]

export const statusConfig: Record<OrderStatus, { label: string; icon: LucideIcon; bg: string; text: string }> = {
  pending_acceptances:       { label: 'Санал хүлээж байна',                  icon: Clock,        bg: 'bg-primary/10',     text: 'text-primary'        },
  awaiting_payment:          { label: 'Төлбөр хийнэ үү',                     icon: AlertCircle,  bg: 'bg-highlight/10',      text: 'text-highlight-strong'  },
  searching_worker:          { label: 'Ажилтан хайж байна',                  icon: Search,       bg: 'bg-primary/10',     text: 'text-primary'        },
  pending_worker_acceptance: { label: 'Ажилтан хариу өгөхийг хүлээж байна', icon: Clock,        bg: 'bg-primary/10',     text: 'text-primary'        },
  pending_payment:           { label: 'Төлбөр хүлээж байна',                 icon: Clock,        bg: 'bg-highlight/10',      text: 'text-highlight-strong'  },
  worker_assigned:           { label: 'Ажилтан олдлоо',                      icon: Clock,        bg: 'bg-primary/10',     text: 'text-primary'        },
  worker_on_the_way:         { label: 'Ирж байна',                           icon: Clock,        bg: 'bg-highlight/10',      text: 'text-highlight-strong'  },
  in_progress:               { label: 'Ажиллаж байна',                       icon: AlertCircle,  bg: 'bg-highlight/10',      text: 'text-highlight-strong'  },
  completed:                 { label: 'Дууссан',                             icon: CheckCircle2, bg: 'bg-success/10',     text: 'text-success'        },
  rated:                     { label: 'Үнэлсэн',                             icon: CheckCircle2, bg: 'bg-success/10',     text: 'text-success'        },
  cancelled_by_user:         { label: 'Цуцлагдсан',                          icon: XCircle,      bg: 'bg-destructive/10', text: 'text-destructive'    },
  cancelled_by_worker:       { label: 'Ажилтан цуцалсан',                    icon: XCircle,      bg: 'bg-destructive/10', text: 'text-destructive'    },
  no_workers_found:          { label: 'Ажилтан олдсонгүй',                   icon: XCircle,      bg: 'bg-destructive/10', text: 'text-destructive'    },
  awaiting_quote:            { label: 'Үнийн санал хүлээж байна',            icon: Clock,        bg: 'bg-primary/10',     text: 'text-primary'        },
  quote_submitted:           { label: 'Үнийн санал ирсэн',                   icon: Clock,        bg: 'bg-highlight/10',      text: 'text-highlight-strong'  },
  quote_approved:            { label: 'Үнийн санал зөвшөөрсөн',              icon: CheckCircle2, bg: 'bg-success/10',     text: 'text-success'        },
  quote_rejected:            { label: 'Үнийн санал татгалзсан',              icon: XCircle,      bg: 'bg-destructive/10', text: 'text-destructive'    },
}

// Where tapping an order should take the customer, by order state.
export function orderHref(order: Pick<Order, 'id' | 'status' | 'matchingStrategy' | 'workerId'>): string {
  const isBidFlow = order.matchingStrategy === 'scheduled'
  if (order.status === 'pending_acceptances' && isBidFlow) return `/orders/${order.id}/applicants`
  if (order.status === 'awaiting_payment' && order.workerId) return `/orders/${order.id}/applicants/${order.workerId}/confirm`
  if (order.status === 'pending_acceptances') return `/orders/${order.id}/board`
  return `/active/${order.id}`
}
