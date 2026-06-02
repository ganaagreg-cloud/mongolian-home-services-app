'use client'

import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Wallet, TrendingUp, CreditCard, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { fetcher } from '@/lib/fetcher'
import type { Transaction } from '@/lib/types'

interface EarningsData {
  totalEarned:     number
  thisMonthEarned: number
  pendingPayout:   number
  transactions:    Transaction[]
}

export function WorkerEarningsScreen() {
  const router = useRouter()
  const { data, isLoading, error, mutate } = useSWR<EarningsData>(
    '/api/workers/me/earnings',
    fetcher,
    { shouldRetryOnError: false },
  )

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-12">
        <h1 className="text-xl font-bold text-foreground">Орлого</h1>
      </div>

      {/* Balance Card */}
      <div className="mx-6 mt-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 shadow-lg">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary-foreground/80" />
          <span className="text-sm font-medium text-primary-foreground/80">Нийт орлого</span>
        </div>
        {isLoading ? (
          <Skeleton className="mt-2 h-9 w-40 bg-primary-foreground/20" />
        ) : (
          <p className="mt-2 text-3xl font-bold text-primary-foreground">
            ₮{(data?.totalEarned ?? 0).toLocaleString()}
          </p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary-foreground/80" />
          {isLoading ? (
            <Skeleton className="h-4 w-48 bg-primary-foreground/20" />
          ) : (
            <span className="text-sm text-primary-foreground/80">
              Энэ сар +₮{(data?.thisMonthEarned ?? 0).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mx-6 mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Энэ сарын орлого</p>
          {isLoading ? (
            <Skeleton className="mt-1 h-7 w-24" />
          ) : (
            <p className="mt-1 text-xl font-bold text-foreground">
              ₮{(data?.thisMonthEarned ?? 0).toLocaleString()}
            </p>
          )}
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Хүлээгдэж буй</p>
          {isLoading ? (
            <Skeleton className="mt-1 h-7 w-24" />
          ) : (
            <p className="mt-1 text-xl font-bold text-accent">
              ₮{(data?.pendingPayout ?? 0).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="mx-6 mt-6">
        <h2 className="font-semibold text-foreground">Гүйлгээний түүх</h2>

        {isLoading && (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-sm text-destructive">Орлогын мэдээлэл ачаалахад алдаа гарлаа</p>
            <button
              onClick={() => { void mutate() }}
              className="text-sm font-semibold text-primary active:scale-95 transition-all"
            >
              Дахин оролдох
            </button>
          </div>
        )}

        {!isLoading && (!data?.transactions || data.transactions.length === 0) && (
          <div className="mt-8 flex flex-col items-center justify-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card">
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-3 font-semibold text-foreground">Гүйлгээ байхгүй</p>
            <p className="mt-1 text-sm text-muted-foreground">Ажил дуусгасны дараа энд харагдана</p>
          </div>
        )}

        {!isLoading && data && data.transactions.length > 0 && (
          <div className="mt-4 space-y-3">
            {data.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    tx.type === 'earning' ? 'bg-success/10' : 'bg-accent/10'
                  }`}>
                    {tx.type === 'earning'
                      ? <ArrowDownLeft className="h-5 w-5 text-success" />
                      : <ArrowUpRight  className="h-5 w-5 text-accent" />}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{tx.service}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString('mn-MN')}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${tx.type === 'earning' ? 'text-success' : 'text-foreground'}`}>
                  {tx.type === 'earning' ? '+' : ''}₮{Math.abs(tx.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manage Bank */}
      <div className="mx-6 mt-6">
        <Button
          onClick={() => router.push('/worker-profile')}
          variant="outline"
          className="h-14 w-full rounded-2xl border-border bg-card font-semibold shadow-sm active:scale-95 transition-all"
        >
          <CreditCard className="mr-2 h-5 w-5" />
          Банкны дансны мэдээлэл
        </Button>
      </div>
    </div>
  )
}
