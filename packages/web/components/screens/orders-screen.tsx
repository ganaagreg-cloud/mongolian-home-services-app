'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, Search, Camera, X, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { fetcher } from '@/lib/fetcher'
import { apiFetch } from '@/lib/api-fetch'
import type { Order, OrderStatus } from '@/lib/types'

const ACTIVE_STATUSES: OrderStatus[] = [
  'searching_worker', 'pending_acceptances', 'awaiting_payment', 'pending_worker_acceptance', 'worker_assigned', 'worker_on_the_way', 'in_progress',
]

const statusConfig: Record<OrderStatus, { label: string; icon: typeof Clock; bg: string; text: string }> = {
  pending_acceptances:       { label: 'Санал хүлээж байна',                  icon: Clock,        bg: 'bg-primary/10',     text: 'text-primary'     },
  awaiting_payment:          { label: 'Төлбөр хийнэ үү',                     icon: AlertCircle,  bg: 'bg-accent/10',      text: 'text-accent'      },
  searching_worker:          { label: 'Ажилтан хайж байна',                  icon: Search,       bg: 'bg-primary/10',     text: 'text-primary'     },
  pending_worker_acceptance: { label: 'Ажилтан хариу өгөхийг хүлээж байна', icon: Clock,        bg: 'bg-primary/10',     text: 'text-primary'     },
  pending_payment:           { label: 'Төлбөр хүлээж байна',                 icon: Clock,        bg: 'bg-accent/10',      text: 'text-accent'      },
  worker_assigned:           { label: 'Ажилтан олдлоо',                      icon: Clock,        bg: 'bg-primary/10',     text: 'text-primary'     },
  worker_on_the_way:         { label: 'Ирж байна',                           icon: Clock,        bg: 'bg-accent/10',      text: 'text-accent'      },
  in_progress:               { label: 'Ажиллаж байна',                       icon: AlertCircle,  bg: 'bg-accent/10',      text: 'text-accent'      },
  completed:                 { label: 'Дууссан',                             icon: CheckCircle2, bg: 'bg-success/10',     text: 'text-success'     },
  rated:                     { label: 'Үнэлсэн',                             icon: CheckCircle2, bg: 'bg-success/10',     text: 'text-success'     },
  cancelled_by_user:         { label: 'Цуцлагдсан',                          icon: XCircle,      bg: 'bg-destructive/10', text: 'text-destructive' },
  cancelled_by_worker:       { label: 'Ажилтан цуцалсан',                    icon: XCircle,      bg: 'bg-destructive/10', text: 'text-destructive' },
  no_workers_found:          { label: 'Ажилтан олдсонгүй',                   icon: XCircle,      bg: 'bg-destructive/10', text: 'text-destructive' },
  awaiting_quote:            { label: 'Үнийн санал хүлээж байна',            icon: Clock,        bg: 'bg-primary/10',     text: 'text-primary'     },
  quote_submitted:           { label: 'Үнийн санал ирсэн',                   icon: Clock,        bg: 'bg-accent/10',      text: 'text-accent'      },
  quote_approved:            { label: 'Үнийн санал зөвшөөрсөн',              icon: CheckCircle2, bg: 'bg-success/10',     text: 'text-success'     },
  quote_rejected:            { label: 'Үнийн санал татгалзсан',              icon: XCircle,      bg: 'bg-destructive/10', text: 'text-destructive' },
}

const DISPUTE_REASONS = [
  { value: 'хохирол',         label: 'Хохирол учруулсан' },
  { value: 'чанар муу',       label: 'Ажлын чанар муу'   },
  { value: 'ажилтан ирээгүй', label: 'Ажилтан ирээгүй'   },
  { value: 'бусад',           label: 'Бусад'              },
] as const

function isWithin7Days(dateStr: string): boolean {
  return new Date(dateStr) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
}

function OrderCard({
  order,
  onDispute,
}: {
  order: Order
  onDispute: (order: Order) => void
}) {
  const router = useRouter()
  const cfg = statusConfig[order.status]
  const StatusIcon = cfg.icon
  const isActive = ACTIVE_STATUSES.includes(order.status)
  const isPendingAcceptances = order.status === 'pending_acceptances'
  const isAwaitingPayment    = order.status === 'awaiting_payment'
  const isBidFlow            = order.matchingStrategy === 'scheduled'
  const canDispute = order.status === 'completed' && isWithin7Days(order.updatedAt)
  const dateLabel = order.scheduledDate.split('T')[0] ?? order.scheduledDate

  const handleViewClick = () => {
    if (isPendingAcceptances && isBidFlow) {
      router.push(`/orders/${order.id}/applicants`)
    } else if (isAwaitingPayment && order.workerId) {
      router.push(`/orders/${order.id}/applicants/${order.workerId}/confirm`)
    } else if (isPendingAcceptances) {
      router.push(`/orders/${order.id}/board`)
    } else {
      router.push(`/active/${order.id}`)
    }
  }

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
            {(isPendingAcceptances && !isAwaitingPayment) ? order.service[0] : (order.workerName ?? order.service[0])}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold text-foreground">
              {(isPendingAcceptances && !isAwaitingPayment) ? order.service : (order.workerName ?? order.service)}
            </p>
            <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{order.service} · {order.hours}ц</p>
          <p className="text-xs text-muted-foreground">{dateLabel}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <p className="text-sm font-semibold text-primary">₮{order.totalAmount.toLocaleString()}</p>
        <div className="flex items-center gap-2">
          {canDispute && (
            <Button
              onClick={() => onDispute(order)}
              size="sm"
              variant="outline"
              className="h-9 rounded-2xl border-destructive/30 text-destructive text-xs font-medium active:scale-95 transition-all"
            >
              Асуудал мэдэгдэх
            </Button>
          )}
          {isActive && (
            <Button
              onClick={handleViewClick}
              size="sm"
              className={`h-9 rounded-2xl text-sm font-semibold shadow-md active:scale-95 transition-all ${
                isAwaitingPayment
                  ? 'bg-accent hover:bg-accent/90'
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {isPendingAcceptances && isBidFlow ? (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Саналууд
                </span>
              ) : isAwaitingPayment ? (
                'Төлбөр хийх'
              ) : (
                'Харах'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function OrdersScreen() {
  const router = useRouter()
  const [tab, setTab] = useState<'active' | 'past'>('active')
  const { data: orders, isLoading, error } = useSWR<Order[]>('/api/orders', fetcher)

  const [disputeOrder, setDisputeOrder] = useState<Order | null>(null)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [disputeError, setDisputeError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = (orders ?? []).filter((o) =>
    tab === 'active' ? ACTIVE_STATUSES.includes(o.status) : !ACTIVE_STATUSES.includes(o.status)
  )

  const handleOpenDispute = (order: Order) => {
    setDisputeOrder(order)
    setReason('')
    setDescription('')
    setPhotos([])
    setDisputeError('')
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setPhotos((prev) => [...prev, ...files].slice(0, 3))
    e.target.value = ''
  }

  const handleDisputeSubmit = async () => {
    if (!disputeOrder) return
    if (!reason) { setDisputeError('Шалтгаан сонгоно уу'); return }
    if (description.length < 20) { setDisputeError('Тайлбар хамгийн багадаа 20 тэмдэгт байх ёстой'); return }

    setSubmitting(true)
    setDisputeError('')
    try {
      const res = await apiFetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: parseInt(disputeOrder.id), reason, description }),
      })
      const json = await res.json() as { success: boolean; error?: string; data?: { id: string } }
      if (!json.success) {
        setDisputeError(json.error ?? 'Алдаа гарлаа')
        return
      }
      if (photos.length > 0 && json.data?.id) {
        const disputeId = json.data.id
        for (const photo of photos) {
          const fd = new FormData()
          fd.append('photo', photo)
          await apiFetch(`/api/disputes/${disputeId}/upload`, { method: 'POST', body: fd })
        }
      }
      setDisputeOrder(null)
      setPhotos([])
      toast.success('Гомдол амжилттай илгээгдлээ. Админ ажиллана.')
    } catch {
      setDisputeError('Алдаа гарлаа')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Захиалгын түүх</h1>
      </div>

      {/* Tabs */}
      <div className="mt-6 px-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'past')}>
          <TabsList className="w-full rounded-2xl bg-card p-1 h-12">
            <TabsTrigger
              value="active"
              className="flex-1 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Идэвхтэй
            </TabsTrigger>
            <TabsTrigger
              value="past"
              className="flex-1 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Өнгөрсөн
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Order List */}
      <div className="mt-4 space-y-3 px-6 min-h-[264px]">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-destructive">Захиалга ачаалахад алдаа гарлаа</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-card">
              <Clock className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="mt-4 text-lg font-semibold text-foreground">Захиалга байхгүй</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === 'active' ? 'Одоогоор идэвхтэй захиалга алга' : 'Өнгөрсөн захиалга байхгүй байна'}
            </p>
          </div>
        ) : (
          filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onDispute={handleOpenDispute}
            />
          ))
        )}
      </div>

      {/* Dispute Modal */}
      <Dialog open={disputeOrder !== null} onOpenChange={(open) => { if (!open) setDisputeOrder(null) }}>
        <DialogContent className="rounded-2xl mx-4 max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Асуудал мэдэгдэх</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Шалтгаан</p>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="h-12 rounded-2xl border-border bg-card shadow-sm">
                  <SelectValue placeholder="Шалтгаан сонгоно уу" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {DISPUTE_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Тайлбар
                <span className="ml-1 text-xs text-muted-foreground">({description.length}/20 тэмдэгт)</span>
              </p>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Болсон зүйлийг дэлгэрэнгүй тайлбарлана уу…"
                className="min-h-[100px] rounded-2xl border-border bg-card shadow-sm resize-none"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Зураг <span className="text-xs">(заавал биш, хамгийн ихдээ 3)</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handlePhotoSelect}
              />
              {photos.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card py-3 text-sm text-muted-foreground active:scale-95 transition-all"
                >
                  <Camera className="h-4 w-4" />
                  Зураг нэмэх {photos.length > 0 && `(${photos.length}/3)`}
                </button>
              )}
              {photos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(photo)}
                        alt=""
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {disputeError && (
              <p className="text-sm text-destructive">{disputeError}</p>
            )}
          </div>

          <DialogFooter className="flex flex-row gap-3 mt-2">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-2xl"
              onClick={() => setDisputeOrder(null)}
              disabled={submitting}
            >
              Болих
            </Button>
            <Button
              className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all"
              onClick={() => { void handleDisputeSubmit() }}
              disabled={submitting || !reason || description.length < 20}
            >
              {submitting ? 'Илгээж байна…' : 'Илгээх'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
