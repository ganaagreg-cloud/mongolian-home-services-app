'use client'

import { Wallet, TrendingUp, CreditCard, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetcher } from '@/lib/fetcher'
import { useState } from 'react'

interface Transaction {
  id: string
  createdAt: string
  service: string
  amount: number
  type: 'earning' | 'withdrawal'
}

interface EarningsData {
  totalEarned: number
  thisMonthEarned: number
  thisWeekEarned: number
  pendingPayout: number
  transactions: Transaction[]
}

interface WorkerEarningsScreenProps {
  onConnectBank: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' })
}

export function WorkerEarningsScreen({ onConnectBank }: WorkerEarningsScreenProps) {
  const [period, setPeriod] = useState<'week' | 'month'>('month')

  const { data, isLoading } = useSWR<EarningsData>(
    '/api/workers/me/earnings',
    fetcher,
    { shouldRetryOnError: false },
  )

  const displayEarnings = period === 'month'
    ? (data?.thisMonthEarned ?? 0)
    : (data?.thisWeekEarned ?? 0)

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-12">
        <h1 className="text-xl font-bold text-foreground">Орлого</h1>
      </div>

      {/* Balance Card */}
      <div className="mt-6 mx-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 shadow-lg">
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
            <Skeleton className="h-4 w-32 bg-primary-foreground/20" />
          ) : (
            <span className="text-sm text-primary-foreground/80">
              Хүлээгдэж буй: ₮{(data?.pendingPayout ?? 0).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Period Tabs */}
      <div className="mt-6 px-6">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as 'week' | 'month')}>
          <TabsList className="w-full bg-card rounded-2xl p-1 h-12">
            <TabsTrigger
              value="week"
              className="flex-1 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Энэ долоо хоног
            </TabsTrigger>
            <TabsTrigger
              value="month"
              className="flex-1 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Энэ сар
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-4 rounded-2xl bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            {period === 'week' ? 'Долоо хоногийн' : 'Сарын'} орлого
          </p>
          {isLoading ? (
            <Skeleton className="mt-1 h-8 w-32" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-foreground">₮{displayEarnings.toLocaleString()}</p>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Гүйлгээний түүх</h2>

        {isLoading && (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && (data?.transactions ?? []).length === 0 && (
          <div className="mt-8 flex flex-col items-center justify-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card">
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 font-semibold text-foreground">Гүйлгээ байхгүй байна</p>
            <p className="mt-1 text-sm text-muted-foreground">Ажил гүйцэтгэсний дараа энд харагдана</p>
          </div>
        )}

        {!isLoading && (data?.transactions ?? []).length > 0 && (
          <div className="mt-4 space-y-3">
            {data!.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      tx.type === 'earning' ? 'bg-success/10' : 'bg-accent/10'
                    }`}
                  >
                    {tx.type === 'earning' ? (
                      <ArrowDownLeft className="h-5 w-5 text-success" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-accent" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{tx.service}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                  </div>
                </div>
                <span
                  className={`font-semibold ${
                    tx.type === 'earning' ? 'text-success' : 'text-foreground'
                  }`}
                >
                  {tx.type === 'earning' ? '+' : ''}₮{Math.abs(tx.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect Bank Button */}
      <div className="mt-6 mx-6">
        <Button
          onClick={onConnectBank}
          variant="outline"
          className="h-14 w-full rounded-2xl border-border bg-card font-semibold shadow-sm"
        >
          <CreditCard className="mr-2 h-5 w-5" />
          Банкны данс холбох
        </Button>
      </div>
    </div>
  )
}
