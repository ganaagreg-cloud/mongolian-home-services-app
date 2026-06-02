'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, MessageCircle, MapPin, Clock, AlertCircle, FileText, CheckCircle2, ArrowUpDown, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { apiFetch } from '@/lib/api-fetch'
import { SosButton } from '@/components/sos-button'
import type { Order } from '@/lib/types'

interface WorkerActiveScreenProps {
  orderId?: string | null
}

export function WorkerActiveScreen({ orderId }: WorkerActiveScreenProps) {
  const router = useRouter()
  const url = orderId ? `/api/orders/${orderId}` : '/api/orders?worker_active=1'
  const { data: order, isLoading, mutate } = useSWR<Order | null>(url, fetcher, { refreshInterval: 10000 })

  const [updating,     setUpdating]     = useState(false)
  const [updateError,  setUpdateError]  = useState<string | null>(null)
  const [uploadingType, setUploadingType] = useState<'before' | 'after' | null>(null)
  const [uploadError,  setUploadError]  = useState<string | null>(null)

  const [showQuoteModal,   setShowQuoteModal]   = useState(false)
  const [quoteAmount,      setQuoteAmount]      = useState('')
  const [quoteDescription, setQuoteDescription] = useState('')
  const [quoteSending,     setQuoteSending]     = useState(false)
  const [quoteError,       setQuoteError]       = useState<string | null>(null)

  const beforeInputRef = useRef<HTMLInputElement>(null)
  const afterInputRef  = useRef<HTMLInputElement>(null)

  const updateStatus = async (status: string) => {
    if (!order) return
    setUpdating(true)
    setUpdateError(null)
    try {
      const res = await apiFetch(`/api/orders/${order.id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      })
      const d = (await res.json()) as { success: boolean; error?: string }
      if (!d.success) {
        setUpdateError(d.error ?? 'Алдаа гарлаа')
      } else {
        await mutate()
        if (status === 'completed') router.push('/jobs')
      }
    } catch {
      setUpdateError('Сүлжээний алдаа. Дахин оролдоно уу.')
    } finally {
      setUpdating(false)
    }
  }

  const handleFileSelect = async (type: 'before' | 'after', file: File) => {
    if (!order) return
    setUploadingType(type)
    setUploadError(null)
    try {
      const form = new FormData()
      form.append('photo', file)
      form.append('type', type)
      const res = await apiFetch(`/api/orders/${order.id}/upload`, { method: 'POST', body: form })
      const d = (await res.json()) as { success: boolean; error?: string }
      if (!d.success) {
        setUploadError(d.error ?? 'Зураг байршуулахад алдаа гарлаа')
      } else {
        await mutate()
      }
    } catch {
      setUploadError('Сүлжээний алдаа. Дахин оролдоно уу.')
    } finally {
      setUploadingType(null)
    }
  }

  const closeQuoteModal = () => {
    setShowQuoteModal(false)
    setQuoteAmount('')
    setQuoteDescription('')
    setQuoteError(null)
  }

  const submitQuote = async () => {
    if (!order) return
    const amountInt = parseInt(quoteAmount, 10)
    if (!quoteAmount || isNaN(amountInt) || amountInt <= 0) {
      setQuoteError('Засварын үнэ оруулна уу')
      return
    }
    if (!quoteDescription.trim()) {
      setQuoteError('Засварын тайлбар оруулна уу')
      return
    }
    setQuoteSending(true)
    setQuoteError(null)
    try {
      const res = await apiFetch(`/api/orders/${order.id}/quote`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amount: amountInt, description: quoteDescription.trim() }),
      })
      const d = (await res.json()) as { success: boolean; error?: string }
      if (!d.success) {
        setQuoteError(d.error ?? 'Алдаа гарлаа')
      } else {
        closeQuoteModal()
        await mutate()
      }
    } catch {
      setQuoteError('Сүлжээний алдаа. Дахин оролдоно уу.')
    } finally {
      setQuoteSending(false)
    }
  }

  if (!isLoading && !order) {
    return (
      <div className="flex min-h-screen flex-col bg-background pb-32">
        <div className="px-6 pt-12">
          <h1 className="text-xl font-bold text-foreground">Идэвхтэй ажил</h1>
        </div>
        <div className="mt-6 mx-6 flex flex-col items-center justify-center rounded-2xl bg-card py-16 shadow-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="mt-4 font-semibold text-foreground">Идэвхтэй ажил байхгүй</p>
          <p className="mt-1 text-sm text-muted-foreground">Захиалга хүлээн авахад энд харагдана</p>
        </div>
      </div>
    )
  }

  const scheduledLabel = order
    ? `${order.scheduledDate.slice(0, 10)} · ${order.scheduledDate.slice(11, 16)}`
    : '—'

  const isAssigned      = order?.status === 'worker_assigned'
  const isOnTheWay      = order?.status === 'worker_on_the_way'
  const isInProgress    = order?.status === 'in_progress'
  const isAwaitingQuote = order?.status === 'awaiting_quote'
  const isQuoteSubmitted = order?.status === 'quote_submitted'

  const hasBefore = !!order?.beforePhotoUrl
  const hasAfter  = !!order?.afterPhotoUrl

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">

      {/* Header */}
      <div className="px-6 pt-12">
        <h1 className="text-xl font-bold text-foreground">Идэвхтэй ажил</h1>
        {isLoading ? (
          <Skeleton className="mt-1 h-4 w-32" />
        ) : (
          <p className="text-sm text-muted-foreground">{order?.service}</p>
        )}
      </div>

      {/* Order info */}
      <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Хаяг</p>
                <p className="mt-0.5 font-medium text-foreground">{order?.address}</p>
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
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-foreground">{scheduledLabel} · {order?.hours} цаг</p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Нийт дүн</span>
              <span className="font-bold text-primary">₮{order?.totalAmount.toLocaleString()}</span>
            </div>
          </>
        )}
      </div>

      {/* Status action card — assigned / on_the_way */}
      {!isLoading && order && (isAssigned || isOnTheWay) && (
        <div className="mt-4 mx-6 rounded-2xl bg-primary/5 border border-primary/20 p-4">
          <p className="text-sm font-medium text-primary">
            {isAssigned ? 'Захиалга батлагдлаа. Хэрэглэгч таныг хүлээж байна.' : 'Та замдаа явж байна.'}
          </p>
          {isAssigned && (
            <Button
              onClick={() => { void updateStatus('worker_on_the_way') }}
              disabled={updating}
              className="mt-3 h-11 w-full rounded-2xl bg-primary font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
            >
              {updating ? 'Шинэчилж байна...' : 'Замдаа явж байна'}
            </Button>
          )}
          {isOnTheWay && (
            <>
              <Button
                onClick={() => { void updateStatus('in_progress') }}
                disabled={updating || !hasBefore}
                className="mt-3 h-11 w-full rounded-2xl bg-success font-semibold text-white shadow-md hover:bg-success/90 active:scale-95 transition-all disabled:opacity-50"
              >
                {updating ? 'Шинэчилж байна...' : 'Ажил эхлэх'}
              </Button>
              {!hasBefore && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Ажил эхлэхийн өмнө өмнөх зургаа оруулна уу
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Awaiting quote — worker needs to inspect/assess and submit a price */}
      {!isLoading && order && isAwaitingQuote && (
        <>
          {/* Inspection: problem description */}
          {order.pricingModel === 'inspection' && order.notes && (
            <div className="mt-4 mx-6 rounded-2xl bg-card p-4 shadow-sm">
              <h2 className="font-semibold text-foreground">Асуудлын тайлбар</h2>
              <p className="mt-2 text-sm text-foreground">{order.notes}</p>
            </div>
          )}

          {/* Survey: moving details */}
          {order.pricingModel === 'survey' && order.surveyDetails && (
            <div className="mt-4 mx-6 rounded-2xl bg-card p-4 shadow-sm">
              <h2 className="font-semibold text-foreground">Нүүлгэлтийн мэдээлэл</h2>
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Эхлэх хаяг</p>
                    <p className="text-sm font-medium text-foreground">{order.surveyDetails.fromAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Хүрэх хаяг</p>
                    <p className="text-sm font-medium text-foreground">{order.surveyDetails.toAddress}</p>
                  </div>
                </div>
                <div className="flex gap-4 border-t border-border pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Эхлэх давхар</p>
                    <p className="text-sm font-semibold text-foreground">{order.surveyDetails.fromFloor}-р давхар</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Хүрэх давхар</p>
                    <p className="text-sm font-semibold text-foreground">{order.surveyDetails.toFloor}-р давхар</p>
                  </div>
                  <div className="flex items-start gap-1">
                    <ArrowUpDown className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Лифт</p>
                      <p className="text-sm font-semibold text-foreground">
                        {order.surveyDetails.hasLift ? 'Байна' : 'Байхгүй'}
                      </p>
                    </div>
                  </div>
                </div>
                {order.surveyDetails.volumeNote && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground">Ачааны тайлбар</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{order.surveyDetails.volumeNote}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 mx-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Үнийн санал илгээх</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {order.pricingModel === 'survey'
                    ? 'Ачааг үзэж нүүлгэлтийн нийт зардлыг оруулна уу'
                    : 'Асуудлыг үзэж засварын нийт зардлыг оруулна уу'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowQuoteModal(true)}
              disabled={showQuoteModal}
              className="mt-3 h-11 w-full rounded-2xl bg-primary font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
            >
              Үнийн санал илгээх
            </Button>
          </div>
        </>
      )}

      {/* Quote submitted — waiting for user approval */}
      {!isLoading && order && isQuoteSubmitted && (
        <div className="mt-4 mx-6 rounded-2xl border border-success/30 bg-success/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Үнийн санал илгээгдлаа</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Хэрэглэгчийн хариу хүлээж байна.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Before photo — show when on_the_way or in_progress */}
      {!isLoading && order && (isOnTheWay || isInProgress) && (
        <div className="mt-6 mx-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Өмнөх зураг</h2>
            {hasBefore && (
              <span className="text-xs font-medium text-success">Оруулагдсан</span>
            )}
          </div>
          {hasBefore ? (
            <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={order.beforePhotoUrl}
                alt="Өмнөх"
                className="h-48 w-full object-cover"
              />
            </div>
          ) : (
            <>
              <input
                ref={beforeInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleFileSelect('before', f)
                  e.target.value = ''
                }}
              />
              <button
                onClick={() => beforeInputRef.current?.click()}
                disabled={uploadingType === 'before'}
                className="flex h-36 w-full items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 transition-all active:scale-95 disabled:opacity-60"
              >
                {uploadingType === 'before' ? (
                  <p className="text-sm text-primary">Байршуулж байна...</p>
                ) : (
                  <div className="text-center">
                    <Camera className="mx-auto h-8 w-8 text-primary" />
                    <p className="mt-2 text-sm font-medium text-primary">Зураг нэмэх</p>
                  </div>
                )}
              </button>
            </>
          )}
        </div>
      )}

      {/* After photo — show only when in_progress */}
      {!isLoading && order && isInProgress && (
        <div className="mt-6 mx-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Дараах зураг</h2>
            {hasAfter && (
              <span className="text-xs font-medium text-success">Оруулагдсан</span>
            )}
          </div>
          {hasAfter ? (
            <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={order.afterPhotoUrl}
                alt="Дараах"
                className="h-48 w-full object-cover"
              />
            </div>
          ) : (
            <>
              <input
                ref={afterInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleFileSelect('after', f)
                  e.target.value = ''
                }}
              />
              <button
                onClick={() => afterInputRef.current?.click()}
                disabled={uploadingType === 'after'}
                className="flex h-36 w-full items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 transition-all active:scale-95 disabled:opacity-60"
              >
                {uploadingType === 'after' ? (
                  <p className="text-sm text-primary">Байршуулж байна...</p>
                ) : (
                  <div className="text-center">
                    <Camera className="mx-auto h-8 w-8 text-primary" />
                    <p className="mt-2 text-sm font-medium text-primary">Зураг нэмэх</p>
                  </div>
                )}
              </button>
            </>
          )}
        </div>
      )}

      {/* Chat button */}
      <div className="mt-6 mx-6">
        <Button
          onClick={() => router.push('/chat')}
          variant="outline"
          className="h-14 w-full rounded-2xl border-border bg-card font-semibold shadow-sm active:scale-95 transition-all"
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Захиалагчтай чатлах
        </Button>
      </div>

      {/* Error banners */}
      {updateError && (
        <div className="mt-4 mx-6 rounded-2xl bg-destructive/10 px-4 py-3">
          <p className="text-center text-sm text-destructive">{updateError}</p>
        </div>
      )}
      {uploadError && (
        <div className="mt-4 mx-6 rounded-2xl bg-destructive/10 px-4 py-3">
          <p className="text-center text-sm text-destructive">{uploadError}</p>
        </div>
      )}

      {/* Complete button — only when in_progress */}
      {isInProgress && (
        <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
          {!hasAfter && (
            <p className="mb-2 text-center text-xs text-muted-foreground">
              Дараах зургаа оруулсны дараа дуусгах боломжтой
            </p>
          )}
          <Button
            onClick={() => { void updateStatus('completed') }}
            disabled={!hasAfter || updating}
            className="h-14 w-full rounded-2xl bg-success font-semibold text-white shadow-md disabled:opacity-50 hover:bg-success/90 active:scale-95 transition-all"
          >
            {updating ? 'Шинэчилж байна...' : 'Ажил дуусгах'}
          </Button>
        </div>
      )}

      {/* Floating SOS FAB — lifted above the complete footer when it's visible */}
      <SosButton
        orderId={order?.id ? String(order.id) : undefined}
        bottomClass={isInProgress ? 'bottom-28' : 'bottom-6'}
      />

      {/* Quote modal */}
      {showQuoteModal && order && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-[390px] overflow-y-auto rounded-t-3xl bg-background px-6 pb-10 pt-6" style={{ maxHeight: '90vh' }}>
            <h2 className="text-lg font-bold text-foreground">Үнийн санал илгээх</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {order.pricingModel === 'survey'
                ? 'Нүүлгэлтийн нийт зардлыг оруулна уу'
                : 'Засварын нийт зардлыг оруулна уу'}
            </p>

            {/* Read-only context — inspection: problem description */}
            {order.pricingModel === 'inspection' && order.notes && (
              <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">Асуудлын тайлбар</p>
                <p className="mt-1 text-sm text-foreground">{order.notes}</p>
              </div>
            )}

            {/* Read-only context — survey: moving details */}
            {order.pricingModel === 'survey' && order.surveyDetails && (
              <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">Нүүлгэлтийн мэдээлэл</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Эхлэх хаяг</p>
                      <p className="text-sm font-medium text-foreground leading-snug">{order.surveyDetails.fromAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Хүрэх хаяг</p>
                      <p className="text-sm font-medium text-foreground leading-snug">{order.surveyDetails.toAddress}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 border-t border-border pt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Эхлэх давхар</p>
                      <p className="text-sm font-semibold text-foreground">{order.surveyDetails.fromFloor}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Хүрэх давхар</p>
                      <p className="text-sm font-semibold text-foreground">{order.surveyDetails.toFloor}</p>
                    </div>
                    <div className="flex items-start gap-1">
                      <ArrowUpDown className="mt-0.5 h-3 w-3 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Лифт</p>
                        <p className="text-sm font-semibold text-foreground">
                          {order.surveyDetails.hasLift ? 'Байна' : 'Байхгүй'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {order.surveyDetails.volumeNote && (
                    <div className="border-t border-border pt-2">
                      <p className="text-xs text-muted-foreground">Ачааны тайлбар</p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">{order.surveyDetails.volumeNote}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4">
              <p className="font-semibold text-foreground">
                {order.pricingModel === 'survey' ? 'Нүүлгэлтийн үнэ' : 'Засварын үнэ'}
              </p>
              <div className="relative mt-2">
                <input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="75000"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-border bg-card pl-4 pr-10 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  ₮
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">MNT-ээр оруулна уу</p>
            </div>

            <div className="mt-4">
              <p className="font-semibold text-foreground">
                {order.pricingModel === 'survey' ? 'Нүүлгэлтийн тайлбар' : 'Засварын тайлбар'}
              </p>
              <textarea
                placeholder={
                  order.pricingModel === 'survey'
                    ? 'Нүүлгэлтийн ажлын тайлбар, зай, цаг...'
                    : 'Хийх ажлын тайлбар, материалын зардал...'
                }
                value={quoteDescription}
                onChange={(e) => setQuoteDescription(e.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-2xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {quoteError && (
              <p className="mt-2 text-sm text-destructive">{quoteError}</p>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                onClick={closeQuoteModal}
                disabled={quoteSending}
                className="h-14 flex-1 rounded-2xl border-border bg-card font-semibold shadow-sm active:scale-95 transition-all"
              >
                Болих
              </Button>
              <Button
                onClick={() => { void submitQuote() }}
                disabled={quoteSending}
                className="h-14 flex-1 rounded-2xl bg-accent font-semibold text-accent-foreground shadow-md hover:bg-accent/90 disabled:opacity-50 active:scale-95 transition-all"
              >
                {quoteSending ? 'Илгээж байна...' : 'Илгээх'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
