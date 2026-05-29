'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { ArrowLeft, Lock, Star } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { fetcher } from '@/lib/fetcher'
import { apiFetch } from '@/lib/api-fetch'
import type { MatchedWorker, Order, PaymentInvoice } from '@/lib/types'

interface ConfirmWorkerScreenProps {
  orderId: string
  worker: MatchedWorker
  onConfirm: () => void
  onBack: () => void
}

export function ConfirmWorkerScreen({ orderId, worker, onConfirm, onBack }: ConfirmWorkerScreenProps) {
  const [order, setOrder]               = useState<Order | null>(null)
  const [invoice, setInvoice]           = useState<PaymentInvoice | null>(null)
  const [invoiceError, setInvoiceError] = useState<string | null>(null)

  // Fetch order for price summary
  useEffect(() => {
    apiFetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((d: { success: boolean; data?: Order }) => { if (d.success && d.data) setOrder(d.data) })
      .catch(() => {})
  }, [orderId])

  // Create invoice on mount
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const res = await apiFetch('/api/payments/create-invoice', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ orderId }),
        })
        const d = (await res.json()) as { success: boolean; data?: PaymentInvoice; error?: string }
        if (cancelled) return
        if (d.success && d.data) setInvoice(d.data)
        else setInvoiceError(d.error ?? 'Invoice үүсгэхэд алдаа гарлаа')
      } catch {
        if (!cancelled) setInvoiceError('Invoice үүсгэхэд алдаа гарлаа')
      }
    }
    void init()
    return () => { cancelled = true }
  }, [orderId])

  // Poll every 3 s — only after invoice is created so we don't navigate immediately
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

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">

      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Ажилтан баталгаажуулах</h1>
      </div>

      {/* Worker details */}
      <div className="mt-6 mx-6 rounded-2xl bg-card p-5 shadow-md">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
              {worker.name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-lg font-bold text-foreground">{worker.name}</p>
              <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                ДАН
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{worker.specialty}</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                <span className="text-sm font-semibold text-foreground">{worker.rating}</span>
              </div>
              <span className="text-sm font-semibold text-primary">
                ₮{worker.pricePerHour.toLocaleString()}/цаг
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Price summary */}
      {order && (
        <div className="mt-4 mx-6 rounded-2xl bg-card p-4 shadow-sm">
          <h2 className="font-semibold text-foreground">Үнийн хураангуй</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{order.service} ({order.hours} цаг)</span>
              <span className="text-foreground">₮{(worker.pricePerHour * order.hours).toLocaleString()}</span>
            </div>
            {order.urgent && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Яаралтай нэмэгдэл (+20%)</span>
                <span className="font-medium text-accent">
                  +₮{Math.round(worker.pricePerHour * order.hours * 0.2).toLocaleString()}
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
            Ажил дуусаагүй бол мөнгө суллагдахгүй. Маргаан гарвал дэмжлэг үзүүлнэ.
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
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
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
