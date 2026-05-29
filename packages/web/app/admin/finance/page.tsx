'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, Percent, ShieldCheck, Clock } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'

type Payout = {
  worker_id: number; name: string
  total_earned: number; total_withdrawn: number; pending: number
}
type Tx = {
  id: number; amount: number; type: string; service: string
  created_at: string; worker_name: string | null
}
type FinanceData = {
  totalRevenue: number; monthRevenue: number
  totalCommission: number; totalDamageFund: number
  payouts: Payout[]; transactions: Tx[]
}

function fmt(n: number) { return `₮${n.toLocaleString('mn-MN')}` }

export default function FinancePage() {
  const [data,    setData]    = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [txFilter, setTxFilter] = useState('all')

  useEffect(() => {
    apiFetch('/api/admin/finance')
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data) })
      .finally(() => setLoading(false))
  }, [])

  const STAT_CARDS = data ? [
    { label: 'Нийт орлого',           value: fmt(data.totalRevenue),    icon: TrendingUp, color: 'text-green-600' },
    { label: 'Сарын орлого',           value: fmt(data.monthRevenue),    icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Нийт шимтгэл (15%)',     value: fmt(data.totalCommission), icon: Percent,    color: 'text-purple-600' },
    { label: 'Даатгалын сан (2%)',      value: fmt(data.totalDamageFund), icon: ShieldCheck, color: 'text-orange-600' },
  ] : []

  const filteredTx = data?.transactions.filter((t) =>
    txFilter === 'all' ? true : t.type === txFilter
  ) ?? []

  return (
    <div className="px-8 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Санхүү</h1>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
            ))
          : STAT_CARDS.map((s) => (
              <Card key={s.label}>
                <CardContent className="flex items-center gap-4 p-6">
                  <s.icon className={`h-8 w-8 ${s.color}`} />
                  <div>
                    <p className="text-lg font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Payouts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> Ажилтнуудын төлбөр
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ажилтан</TableHead>
                    <TableHead className="text-right">Нийт орлого</TableHead>
                    <TableHead className="text-right">Гаргасан</TableHead>
                    <TableHead className="text-right">Хүлээгдэж буй</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.payouts.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="py-8 text-center text-gray-500">Өгөгдөл байхгүй</TableCell></TableRow>
                  )}
                  {data?.payouts.map((p) => (
                    <TableRow key={p.worker_id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(p.total_earned)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(p.total_withdrawn)}</TableCell>
                      <TableCell className="text-right font-semibold text-green-700">{fmt(p.pending)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Transaction log */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Гүйлгээний бүртгэл</CardTitle>
              <Select value={txFilter} onValueChange={setTxFilter}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Бүгд</SelectItem>
                  <SelectItem value="earning">Орлого</SelectItem>
                  <SelectItem value="withdrawal">Зарлага</SelectItem>
                  <SelectItem value="refund">Буцаалт</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ажилтан</TableHead>
                      <TableHead>Төрөл</TableHead>
                      <TableHead className="text-right">Дүн</TableHead>
                      <TableHead>Огноо</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTx.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="py-8 text-center text-gray-500">Гүйлгээ байхгүй</TableCell></TableRow>
                    )}
                    {filteredTx.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm">{t.worker_name ?? '—'}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            t.type === 'earning' ? 'bg-green-100 text-green-700' :
                            t.type === 'withdrawal' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>{t.type}</span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{fmt(t.amount)}</TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {new Date(t.created_at).toLocaleDateString('mn-MN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
