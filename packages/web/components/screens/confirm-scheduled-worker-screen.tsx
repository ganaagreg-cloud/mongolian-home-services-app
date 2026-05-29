'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { ArrowLeft, Lock, Star, Clock, MapPin } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { fetcher } from '@/lib/fetcher'
import { apiFetch } from '@/lib/api-fetch'
import type { Order, OrderAcceptance, PaymentInvoice } from '@/lib/types'

interface ConfirmScheduledWorkerScreenProps {
  orderId: string
  worker: OrderAcceptance
  onConfirm: () => void
  onBack: () => void
}

export function ConfirmScheduledWorkerScreen({
  orderId,
  worker,
  onConfirm,
  onBack,
}: ConfirmScheduledWorkerScreenProps) {
  const [order, setOrder]               = useState<Order | null>(null)
  const [invoice, setInvoice]           = useState<PaymentInvoice | null>(null)
  const [invoiceError, setInvoiceError] = useState<string | null>(null)

  // Fetch order for price/job details
  useEffect(() => {
    apiFetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((d: { success: boolean; data?: Order }) => { if (d.success && d.data) setOrder(d.data) })
      .catch(() => {})
  }, [orderId])

  // 1. PATCH to assign worker, then 2. create invoice — sequential on mount
  useEffect(() => {
    let cancelled = false
    async function init() {
      // Step 1: assign worker
      try {
        const r = await apiFetch(`/api/orders/${orderId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ workerId: worker.workerId }),
        })
        const d = (await r.json()) as { success: boolean; error?: string }
        if (!d.success) {
          if (!cancelled) setInvoiceError(d.error ?? 'Ажилтан оноход алдаа гарлаа')
          return
        }
      } catch {
        if (!cancelled) setInvoiceError('Сүлжээний алдаа гарлаа')
        return
      }
      // Step 2: create invoice
      try {
        const r = await apiFetch('/api/payments/create-invoice', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ orderId }),
        })
        const d = (await r.json()) as { success: boolean; data?: PaymentInvoice; error?: string }
        if (cancelled) return
        if (d.success && d.data) setInvoice(d.data)
        else setInvoiceError(d.error ?? 'Invoice үүсгэхэд алдаа гарлаа')
      } catch {
        if (!cancelled) setInvoiceError('Invoice үүсгэхэд алдаа гарлаа')
      }
    }
    void init()
    return () => { cancelled = true }
  }, [orderId, worker.workerId])

  // Poll every 3 s — only after invoice is created
  const { data: orderPoll } = useSWR<Order | null>(
    invoice ? `/api/orders/${orderId}` : null,
    fetcher,
    { refreshInterval: 3000 },
  )
  useEffect(() => {
    if (orderPoll?.paymentStatus === 'paid') onConfirm()
  }, [orderPoll, onConfirm])

  const handleDevSim = async () => {
    if (!invoice) return
    await apiFetch('/api/payments/dev-sim-pay', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ invoiceId: invoice.invoice_id }),
    })
  }

  const scheduledLabel = order
    ? `${order.scheduledDate.slice(0, 10)} · ${order.scheduledDate.slice(11, 16)}`
    : '—'

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32 lg:ml-64">

      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12 lg:pt-8">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Захиалга баталгаажуулах</h1>
      </div>

      {/* Worker card */}
      <div className="mt-6 mx-6 rounded-2xl bg-card p-5 shadow-md">
        <p className="text-xs font-medium text-muted-foreground mb-3">Сонгосон ажилтан</p>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
              {worker.workerName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-lg font-bold text-foreground">{worker.workerName}</p>
              <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                ДАН
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{worker.workerSpecialty}</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                <span className="text-sm font-semibold text-foreground">{worker.workerRating}</span>
              </div>
              <span className="text-sm font-semibold text-primary">
                ₮{worker.workerPricePerHour.toLocaleString()}/цаг
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
              <span className="shrink-0 text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Хаяг
              </span>
              <span className="text-right text-xs font-medium leading-snug text-foreground">
                {order.address}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
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
                {order.service} ({order.hours} цаг × ₮{worker.workerPricePerHour.toLocaleString()})
              </span>
              <span className="text-foreground">
                ₮{(worker.workerPricePerHour * order.hours).toLocaleString()}
              </span>
            </div>
            {order.urgent && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Яаралтай (+20%)</span>
                <span className="font-medium text-accent">
                  +₮{Math.round(worker.workerPricePerHour * order.hours * 0.2).toLocaleString()}
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

      {/* Bank payment buttons */}
      <div className="mt-6 mx-6">
        <p className="text-sm font-medium text-muted-foreground mb-3">QPay-аар банкаа сонгон төлөх</p>
        {!invoice && !invoiceError && (
          <div className="rounded-2xl bg-card p-4 text-center text-sm text-muted-foreground shadow-sm">
            Төлбөрийн мэдээлэл бэлдэж байна...
          </div>
        )}
        {invoice && (
          <div className="space-y-3">
            {invoice.urls.map((bank) => (
              <button
                key={bank.link}
                onClick={() => { console.log('[DEV] Bank deeplink:', bank.link) }}
                className="h-14 w-full rounded-2xl bg-card shadow-sm border border-border text-base font-medium text-foreground active:scale-95 transition-all"
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
        </div>
      )}

      {/* Fixed bottom — dev sim only */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4 lg:static lg:translate-x-0 lg:max-w-full lg:bg-transparent lg:px-6 lg:pb-6 lg:pt-6">
        <button
          onClick={() => { void handleDevSim() }}
          disabled={!invoice}
          className="w-full rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-center text-sm font-medium text-accent transition-all active:scale-95 disabled:opacity-40"
        >
          [Dev] Simulate Instant Success Tap
        </button>
      </div>
    </div>
  )
}
