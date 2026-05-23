'use client'

import { useState } from 'react'
import { Wallet, TrendingUp, CreditCard, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface Transaction {
  id: string
  date: string
  service: string
  amount: number
  type: 'earning' | 'withdrawal'
}

interface WorkerEarningsScreenProps {
  onConnectBank: () => void
}

const mockTransactions: Transaction[] = [
  { id: '1', date: '2024-01-15', service: 'Цэвэрлэгээ', amount: 45000, type: 'earning' },
  { id: '2', date: '2024-01-14', service: 'Сантехник', amount: 67500, type: 'earning' },
  { id: '3', date: '2024-01-13', service: 'Мөнгө татах', amount: -100000, type: 'withdrawal' },
  { id: '4', date: '2024-01-12', service: 'Цахилгаан', amount: 54000, type: 'earning' },
  { id: '5', date: '2024-01-11', service: 'Цэвэрлэгээ', amount: 45000, type: 'earning' },
]

export function WorkerEarningsScreen({ onConnectBank }: WorkerEarningsScreenProps) {
  const [period, setPeriod] = useState<'week' | 'month'>('week')

  const totalBalance = 256500
  const weeklyEarnings = 166500
  const monthlyEarnings = 485000

  const earnings = period === 'week' ? weeklyEarnings : monthlyEarnings

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
          <span className="text-sm font-medium text-primary-foreground/80">Нийт үлдэгдэл</span>
        </div>
        <p className="mt-2 text-3xl font-bold text-primary-foreground">
          ₮{totalBalance.toLocaleString()}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary-foreground/80" />
          <span className="text-sm text-primary-foreground/80">
            Энэ долоо хоногт +₮{weeklyEarnings.toLocaleString()}
          </span>
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
          <p className="mt-1 text-2xl font-bold text-foreground">₮{earnings.toLocaleString()}</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Гүйлгээний түүх</h2>
        <div className="mt-4 space-y-3">
          {mockTransactions.map((tx) => (
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
                  <p className="text-xs text-muted-foreground">{tx.date}</p>
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
