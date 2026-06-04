'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, Lock, Star, Clock, MapPin } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { fetcher } from '@/lib/fetcher'
import { apiFetch } from '@/lib/api-fetch'
import type { Order, Worker, PaymentInvoice } from '@/lib/types'

interface BidConfirmScreenProps {
  orderId:  string
  workerId: string
}

export function BidConfirmScreen({ orderId, workerId }: BidConfirmScreenProps) {
  const router = useRouter()
  const [invoice,      setInvoice]      = useState<PaymentInvoice | null>(null)
  const [invoiceError, setInvoiceError] = useState<string | null>(null)
  const [devSimError,  setDevSimError]  = useState<string | null>(null)

  const { data: order }      = useSWR<Order>(`/api/orders/${orderId}`, fetcher)
  const { data: workerData } = useSWR<Worker>(`/api/workers/${workerId}`, fetcher)

  // 1. Attempt select-worker; fall back to pending-invoice if order already awaiting_payment
  useEffect(() => {
    let cancelled = false

    async function init() {
      // If order is already worker_assigned (paid), skip straight to active
      if (order?.paymentStatus === 'paid' || order?.status === 'worker_assigned') {
        if (!cancelled) router.push(`/active/${orderId}`)
        return
      }

      // If order is awaiting_payment for this worker, fetch existing invoice
      if (order?.status === 'awaiting_payment' && String(order.workerId) === String(workerId)) {
        try {
          const r = await apiFetch(`/api/orders/${orderId}/pending-invoice`)
          const d = (await r.json()) as { success: boolean; data?: PaymentInvoice; error?: string }
          if (cancelled) return
          if (d.success && d.data) setInvoice(d.data)
          else setInvoiceError(d.error ?? 'Нэхэмжлэл олдсонгүй')
        } catch {
          if (!cancelled) setInvoiceError('Сүлжээний алдаа гарлаа')
        }
        return
      }

      // Normal path: reserve slot + create invoice atomically
      try {
        const r = await apiFetch(`/api/orders/${orderId}/select-worker`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ workerId: Number(workerId) }),
        })
        if (cancelled) return

        if (r.status === 409) {
          const d = (await r.json()) as { error?: string }
          if (d.error?.includes('боломжгүй болсон')) {
            toast.error('Ажилтан энэ цагт боломжгүй болсон байна')
            router.push(`/orders/${orderId}/applicants`)
          } else {
            setInvoiceError(d.error ?? 'Захиалга амжилтгүй болсон байна')
          }
          return
        }

        const d = (await r.json()) as { success: boolean; data?: PaymentInvoice; error?: string }
        if (cancelled) return
        if (d.success && d.data) setInvoice(d.data)
        else setInvoiceError(d.error ?? 'Алдаа гарлаа')
      } catch {
        if (!cancelled) setInvoiceError('Сүлжээний алдаа гарлаа')
      }
    }

    // Only run once order data is available (prevents premature fallback path)
    if (order !== undefined) void init()
    return () => { cancelled = true }
  }, [orderId, workerId, order?.status, order?.workerId, order?.paymentStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for payment confirmation — navigate to active once paid
  const { data: orderPoll } = useSWR<Order>(
    invoice ? `/api/orders/${orderId}` : null,
    fetcher,
    { refreshInterval: 3000 },
  )
  useEffect(() => {
    if (orderPoll?.paymentStatus === 'paid' || orderPoll?.status === 'worker_assigned') {
      router.push(`/active/${orderId}`)
    }
  }, [orderPoll, orderId, router])

  const isDevPanel    = process.env.NEXT_PUBLIC_DEV_PANEL === 'true'
  const pricePerHour  = workerData?.pricePerHour ?? 0
  const scheduledLabel = order
    ? `${order.scheduledDate.slice(0, 10)} · ${order.scheduledDate.slice(11, 16)}`
    : '—'

  // Dev sim calls bid-confirm directly — atomically books slot + marks order paid
  const handleDevSim = async () => {
    if (!invoice) return
    setDevSimError(null)
    try {
      const res = await apiFetch('/api/payments/bid-confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ invoiceId: invoice.invoice_id }),
      })
      const d = (await res.json()) as { success: boolean; error?: string }
      if (!d.success) setDevSimError(d.error ?? 'Симуляц амжилтгүй')
      // On success, polling catches worker_assigned and navigates
    } catch {
      setDevSimError('Сүлжээний алдаа гарлаа')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">

      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Захиалга баталгаажуулах</h1>
      </div>

      {/* Worker card */}
      <div className="mt-6 mx-6 rounded-2xl bg-card p-5 shadow-md">
        <p className="mb-3 text-xs font-medium text-muted-foreground">Сонгосон ажилтан</p>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
              {(workerData?.name ?? '?')[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-lg font-bold text-foreground">{workerData?.name ?? '—'}</p>
              <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                ДАН
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{workerData?.specialty ?? '—'}</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                <span className="text-sm font-semibold text-foreground">{workerData?.rating ?? '—'}</span>
              </div>
              <span className="text-sm font-semibold text-primary">
                ₮{pricePerHour.toLocaleString()}/цаг
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Job details */}
      {order && (
        <div className="mt-4 mx-6 rounded-2xl bg-card p-4 shadow-sm">
          <h2 className="font-semibold text-foreground">Ажлын дэлгэрэнгүй</h2>
          <div className="mt-3 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Үйлчилгээ</span>
              <span className="font-medium text-foreground">{order.service}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Хаяг
              </span>
              <span className="text-right text-xs font-medium leading-snug text-foreground">
                {order.address}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Цаг
              </span>
              <span className="font-medium text-foreground">{scheduledLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Хугацаа</span>
              <span className="font-medium text-foreground">{order.hours} цаг</span>
            </div>
          </div>
        </div>
      )}

      {/* Price summary */}
      {order && (
        <div className="mt-4 mx-6 rounded-2xl bg-card p-4 shadow-sm">
          <h2 className="font-semibold text-foreground">Үнийн хураангуй</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {order.service} ({order.hours}ц × ₮{pricePerHour.toLocaleString()})
              </span>
              <span className="text-foreground">₮{(pricePerHour * order.hours).toLocaleString()}</span>
            </div>
            {order.urgent && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Яаралтай (+20%)</span>
                <span className="font-medium text-accent">
                  +₮{Math.round(pricePerHour * order.hours * 0.2).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Платформын шимтгэл (15%)</span>
              <span className="text-foreground">
                ₮{Math.round(order.totalAmount * 0.15 / 1.15).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="mt-3 flex justify-between border-t border-border pt-3">
            <span className="font-semibold text-foreground">Нийт</span>
            <span className="text-lg font-bold text-primary">₮{order.totalAmount.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Escrow notice */}
      <div className="mt-4 mx-6 flex items-start gap-3 rounded-2xl border border-success/30 bg-success/5 p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-success/10">
          <Lock className="h-4 w-4 text-success" />
        </div>
        <div>
          <p className="text-sm font-medium text-success">Escrow-оор хамгаалагдсан</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ажил дуусаагүй бол мөнгө суллагдахгүй.
          </p>
        </div>
      </div>

      {/* QPay bank buttons */}
      <div className="mt-6 mx-6">
        <p className="mb-3 text-sm font-medium text-muted-foreground">QPay-аар банкаа сонгон төлөх</p>
        {!invoice && !invoiceError && (
          <div className="rounded-2xl bg-card p-4 text-center text-sm text-muted-foreground shadow-sm">
            Төлбөрийн мэдээлэл бэлдэж байна…
          </div>
        )}
        {invoice && (
          <div className="space-y-3">
            {invoice.urls.map((bank) => (
              <button
                key={bank.link}
                onClick={() => { console.log('[DEV] Bank deeplink:', bank.link) }}
                className="h-14 w-full rounded-2xl border border-border bg-card text-base font-medium text-foreground shadow-sm active:scale-95 transition-all"
              >
                {bank.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {invoiceError && (
        <div className="mt-4 mx-6 rounded-2xl bg-destructive/10 px-4 py-3">
          <p className="text-center text-sm text-destructive">{invoiceError}</p>
          <button
            onClick={() => router.push(`/orders/${orderId}/applicants`)}
            className="mt-3 w-full text-center text-sm font-medium text-primary active:scale-95 transition-all"
          >
            ← Ажилтнуудын жагсаалт руу буцах
          </button>
        </div>
      )}

      {/* Fixed bottom: dev sim or waiting indicator */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
        {isDevPanel ? (
          <>
            <button
              onClick={() => { void handleDevSim() }}
              disabled={!invoice}
              className="w-full rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-center text-sm font-medium text-accent transition-all active:scale-95 disabled:opacity-40"
            >
              [Dev] Simulate QPay Success
            </button>
            {devSimError && (
              <p className="mt-2 text-center text-sm text-destructive">{devSimError}</p>
            )}
          </>
        ) : (
          <div className="rounded-2xl bg-card px-4 py-3 text-center text-sm text-muted-foreground shadow-sm">
            Төлбөр хүлээгдэж байна…
          </div>
        )}
      </div>

    </div>
  )
}
