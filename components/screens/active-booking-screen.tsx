'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { MessageCircle, Check, MapPin, Star, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { fetcher } from '@/lib/fetcher'
import { SosButton } from '@/components/sos-button'
import type { Order } from '@/lib/types'

interface ActiveBookingScreenProps {
  orderId?: string
  onChat: () => void
  onBack: () => void
  onReview?: () => void
}

const STATUS_STEPS = [
  'Ажилтан хайж байна',
  'Ажилтан олдлоо',
  'Ирж байна',
  'Ажиллаж байна',
  'Дууслаа',
]

function statusToStep(status: string | undefined): number {
  switch (status) {
    case 'searching_worker':
    case 'pending_acceptances':
      return 0
    case 'worker_assigned':
      return 1
    case 'worker_on_the_way':
      return 2
    case 'in_progress':
      return 3
    case 'completed':
    case 'rated':
      return 4
    default:
      return -1
  }
}

const CANCELLABLE_FREE = new Set([
  'pending_acceptances', 'searching_worker', 'pending_worker_acceptance', 'pending_payment',
])
const CANCELLABLE_FEE = new Set(['worker_assigned', 'worker_on_the_way'])

function getCancelInfo(order: Order): { canCancel: boolean; fee: number; refundAmount: number } {
  if (CANCELLABLE_FREE.has(order.status)) {
    return { canCancel: true, fee: 0, refundAmount: order.totalAmount }
  }
  if (CANCELLABLE_FEE.has(order.status)) {
    const scheduledDate = new Date(order.scheduledDate)
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)
    const fee = scheduledDate <= oneHourFromNow ? 5000 : 0
    return { canCancel: true, fee, refundAmount: order.totalAmount - fee }
  }
  return { canCancel: false, fee: 0, refundAmount: 0 }
}

export function ActiveBookingScreen({ orderId, onChat, onReview }: ActiveBookingScreenProps) {
  const url = orderId ? `/api/orders/${orderId}` : '/api/orders?active=1'
  const { data: order, isLoading, mutate } = useSWR<Order | null>(url, fetcher, { refreshInterval: 8000 })
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const currentStepIndex = statusToStep(order?.status)
  const cancelInfo = order ? getCancelInfo(order) : { canCancel: false, fee: 0, refundAmount: 0 }

  const handleCancel = async () => {
    if (!orderId) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' })
      const json = await res.json() as { success: boolean; error?: string; data?: { refundAmount: number; fee: number } }
      if (!json.success) {
        toast.error(json.error ?? 'Цуцлахад алдаа гарлаа')
      } else {
        setShowCancelDialog(false)
        void mutate()
        if (json.data && json.data.refundAmount > 0) {
          toast.success(`Захиалга цуцлагдлаа. Буцааж авах: ₮${json.data.refundAmount.toLocaleString()}`)
        } else {
          toast.success('Захиалга цуцлагдлаа')
        }
      }
    } catch {
      toast.error('Цуцлахад алдаа гарлаа')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-8 lg:ml-64">
      {/* Header */}
      <div className="px-6 pt-12 lg:pt-8">
        <h1 className="text-xl font-bold text-foreground">Идэвхтэй захиалга</h1>
        {isLoading ? (
          <Skeleton className="mt-1 h-4 w-32" />
        ) : (
          <p className="text-sm text-muted-foreground">{order?.service ?? '—'}</p>
        )}
      </div>

      {/* Worker Card */}
      <div className="mt-6 mx-6 flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
        {isLoading ? (
          <>
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </>
        ) : (
          <>
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                {(order?.workerName ?? '?')[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{order?.workerName ?? '—'}</p>
              <p className="text-sm text-muted-foreground">Платформ чатаар холбоо барина уу</p>
            </div>
            <button
              onClick={onChat}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 active:scale-95 transition-all"
            >
              <MessageCircle className="h-5 w-5 text-primary" />
            </button>
          </>
        )}
      </div>

      {/* Address */}
      <div className="mt-4 mx-6 rounded-2xl bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Хаяг</p>
        {isLoading ? (
          <Skeleton className="mt-1 h-4 w-48" />
        ) : (
          <>
            <p className="mt-1 font-medium text-foreground">{order?.address ?? '—'}</p>
            {order?.address && (
              <a
                href={`https://maps.google.com/maps?q=${encodeURIComponent(order.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary active:scale-95 transition-all"
              >
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="flex-1">Чиглэл авах</span>
              </a>
            )}
          </>
        )}
      </div>

      {/* Progress Timeline */}
      <div className="mt-6 mx-6 rounded-2xl bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-foreground">Явц</h2>
        <div className="mt-4 space-y-4">
          {STATUS_STEPS.map((label, index) => {
            const isCompleted = currentStepIndex > index
            const isCurrent = currentStepIndex === index
            return (
              <div key={index} className="flex items-center gap-4">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    isCompleted
                      ? 'bg-success text-white'
                      : isCurrent
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                </div>
                <span className={`font-medium ${isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </span>
                {isCurrent && (
                  <span className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Одоо
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Before / After photos */}
      {(order?.beforePhotoUrl ?? order?.afterPhotoUrl) && (
        <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
          <h2 className="font-semibold text-foreground">Ажлын зураг</h2>
          <div className={`mt-3 grid gap-3 ${order?.beforePhotoUrl && order?.afterPhotoUrl ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {order?.beforePhotoUrl && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Өмнөх</p>
                <div className="overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.beforePhotoUrl} alt="Өмнөх" className="h-40 w-full object-cover" />
                </div>
              </div>
            )}
            {order?.afterPhotoUrl && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Дараах</p>
                <div className="overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.afterPhotoUrl} alt="Дараах" className="h-40 w-full object-cover" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Button */}
      <div className="mt-4 mx-6">
        <Button
          onClick={onChat}
          variant="outline"
          className="h-14 w-full rounded-2xl border-border bg-card text-base font-semibold shadow-sm active:scale-95 transition-all"
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Чат бичих
        </Button>
      </div>

      {/* Review CTA */}
      {order?.status === 'completed' && onReview && (
        <div className="mt-3 mx-6">
          <Button
            onClick={onReview}
            className="h-14 w-full rounded-2xl bg-accent text-base font-semibold text-white shadow-md hover:bg-accent/90 active:scale-95 transition-all"
          >
            <Star className="mr-2 h-5 w-5" />
            Үнэлгээ өгөх
          </Button>
        </div>
      )}

      {/* Cancel CTA */}
      {cancelInfo.canCancel && (
        <div className="mt-3 mx-6">
          <Button
            onClick={() => setShowCancelDialog(true)}
            variant="outline"
            className="h-14 w-full rounded-2xl border-destructive/30 text-destructive text-base font-semibold hover:bg-destructive/10 active:scale-95 transition-all"
          >
            Захиалга цуцлах
          </Button>
        </div>
      )}

      {/* Floating SOS FAB */}
      <SosButton orderId={orderId} />

      {/* Cancel Confirm Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="rounded-2xl mx-4 max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Захиалга цуцлах уу?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {cancelInfo.fee > 0 ? (
              <div className="rounded-2xl bg-destructive/10 p-4">
                <p className="text-sm font-semibold text-destructive">
                  Цуцлалтын төлбөр: ₮{cancelInfo.fee.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Эхлэх цагаас 1 цаг хүрэхгүй байгаа тул ₮{cancelInfo.fee.toLocaleString()} суутгагдана.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Захиалга цуцлагдана. Төлбөр суутгалгүй.
              </p>
            )}
            {cancelInfo.refundAmount > 0 && (
              <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-sm">
                <span className="text-sm text-muted-foreground">Буцааж авах дүн</span>
                <span className="font-bold text-primary">₮{cancelInfo.refundAmount.toLocaleString()}</span>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row gap-3 mt-2">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-2xl"
              onClick={() => setShowCancelDialog(false)}
              disabled={cancelling}
            >
              Буцах
            </Button>
            <Button
              className="flex-1 h-12 rounded-2xl bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => { void handleCancel() }}
              disabled={cancelling}
            >
              {cancelling ? 'Цуцалж байна…' : 'Тийм, цуцлах'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
