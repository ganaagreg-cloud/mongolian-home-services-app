'use client'

import { useRef, useState } from 'react'
import { Camera, MessageCircle, MapPin, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { apiFetch } from '@/lib/api-fetch'
import { SosButton } from '@/components/sos-button'
import type { Order } from '@/lib/types'

interface WorkerActiveScreenProps {
  orderId?: string | null
  onChat: () => void
  onComplete: () => void
}

export function WorkerActiveScreen({ orderId, onChat, onComplete }: WorkerActiveScreenProps) {
  const url = orderId ? `/api/orders/${orderId}` : '/api/orders?worker_active=1'
  const { data: order, isLoading, mutate } = useSWR<Order | null>(url, fetcher, { refreshInterval: 10000 })

  const [updating,     setUpdating]     = useState(false)
  const [updateError,  setUpdateError]  = useState<string | null>(null)
  const [uploadingType, setUploadingType] = useState<'before' | 'after' | null>(null)
  const [uploadError,  setUploadError]  = useState<string | null>(null)

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
        if (status === 'completed') onComplete()
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

  const isAssigned   = order?.status === 'worker_assigned'
  const isOnTheWay   = order?.status === 'worker_on_the_way'
  const isInProgress = order?.status === 'in_progress'

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
          onClick={onChat}
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
    </div>
  )
}
