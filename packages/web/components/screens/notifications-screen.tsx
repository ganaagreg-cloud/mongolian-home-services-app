'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, Bell } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { fetcher } from '@/lib/fetcher'
import { apiFetch } from '@/lib/api-fetch'
import type { Notification } from '@/lib/types'

type NotifFeedResponse = { data: Notification[]; hasMore: boolean }

export function NotificationsScreen() {
  const router = useRouter()
  const [extraPages, setExtraPages] = useState<Notification[][]>([])
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const url = '/api/notifications'
  const { data, isLoading } = useSWR<NotifFeedResponse>(
    url,
    fetcher,
    { refreshInterval: 30000 },
  )

  // Mark all read on mount
  useEffect(() => {
    void apiFetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markNotificationsRead: true }),
    })
  }, [])

  useEffect(() => {
    if (data) setHasMore(data.hasMore)
  }, [data])

  const loadMore = async () => {
    const lastPage = extraPages.length > 0 ? extraPages[extraPages.length - 1] : data?.data ?? []
    const lastItem = lastPage[lastPage.length - 1]
    if (!lastItem) return
    setLoadingMore(true)
    try {
      const res = await apiFetch(`/api/notifications?before=${encodeURIComponent(lastItem.createdAt)}`)
      const json = (await res.json()) as { success: boolean; data: Notification[]; hasMore: boolean }
      if (json.success) {
        setExtraPages((prev) => [...prev, json.data])
        setHasMore(json.hasMore)
      }
    } catch {
      // best-effort
    } finally {
      setLoadingMore(false)
    }
  }

  const allNotifications = [...(data?.data ?? []), ...extraPages.flat()]

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
        <h1 className="text-xl font-bold text-foreground">Мэдэгдэл</h1>
      </div>

      <div className="mt-6 px-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-card p-4 shadow-sm">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-64" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            ))}
          </div>
        ) : allNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-card">
              <Bell className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="mt-4 text-lg font-semibold text-foreground">Мэдэгдэл алга байна</p>
            <p className="mt-1 text-sm text-muted-foreground">Захиалгын шинэчлэл эндээс харагдана</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allNotifications.map((notif) => (
              <div key={notif.id} className="rounded-2xl bg-card p-4 shadow-sm">
                <p className="font-semibold text-foreground">{notif.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{notif.body}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {new Date(notif.createdAt).toLocaleString('mn-MN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full rounded-2xl bg-card py-3 text-sm font-semibold text-primary shadow-sm active:scale-95 transition-all disabled:opacity-50"
              >
                {loadingMore ? 'Уншиж байна...' : 'Дэлгэрэнгүй'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
