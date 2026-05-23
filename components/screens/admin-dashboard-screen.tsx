'use client'

import { ClipboardList, DollarSign, Users, AlertTriangle, ChevronRight, Clock, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AdminDashboardScreenProps {
  onViewVerifications: () => void
  onViewDisputes: () => void
}

const kpiCards = [
  { id: 'orders', icon: ClipboardList, label: 'Өнөөдрийн захиалга', value: '47', color: 'primary' },
  { id: 'revenue', icon: DollarSign, label: 'Нийт орлого', value: '₮2.4M', color: 'success' },
  { id: 'workers', icon: Users, label: 'Идэвхтэй ажилтан', value: '23', color: 'accent' },
  { id: 'disputes', icon: AlertTriangle, label: 'Шийдэгдээгүй гомдол', value: '5', color: 'destructive' },
]

const recentBookings = [
  { id: '1', customer: 'Болормаа Б.', worker: 'Батболд Д.', service: 'Цэвэрлэгээ', status: 'completed', amount: 50000 },
  { id: '2', customer: 'Ганзориг М.', worker: 'Түвшинбаяр О.', service: 'Сантехник', status: 'in-progress', amount: 75000 },
  { id: '3', customer: 'Энхжаргал Д.', worker: 'Эрдэнэбат М.', service: 'Цахилгаан', status: 'pending', amount: 60000 },
  { id: '4', customer: 'Оюунчимэг С.', worker: 'Ганболд Ц.', service: 'Будаг', status: 'completed', amount: 120000 },
]

const statusConfig = {
  completed: { label: 'Дууссан', variant: 'default' as const, className: 'bg-success/10 text-success border-0' },
  'in-progress': { label: 'Явагдаж байна', variant: 'default' as const, className: 'bg-accent/10 text-accent border-0' },
  pending: { label: 'Хүлээгдэж байна', variant: 'default' as const, className: 'bg-primary/10 text-primary border-0' },
}

export function AdminDashboardScreen({ onViewVerifications, onViewDisputes }: AdminDashboardScreenProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-8">
      {/* Header */}
      <div className="px-6 pt-12">
        <h1 className="text-xl font-bold text-foreground">Админ самбар</h1>
        <p className="text-sm text-muted-foreground">HomeService удирдлагын систем</p>
      </div>

      {/* KPI Cards */}
      <div className="mt-6 px-6">
        <div className="grid grid-cols-2 gap-3">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon
            return (
              <div key={kpi.id} className="rounded-2xl bg-card p-4 shadow-sm">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${kpi.color}/10`}>
                  <Icon className={`h-5 w-5 text-${kpi.color}`} />
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 px-6 space-y-3">
        <button
          onClick={onViewVerifications}
          className="flex w-full items-center justify-between rounded-2xl bg-primary/10 p-4"
        >
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-medium text-foreground">Ажилтан баталгаажуулалт</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">3 хүлээгдэж байна</Badge>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </button>

        <button
          onClick={onViewDisputes}
          className="flex w-full items-center justify-between rounded-2xl bg-destructive/10 p-4"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="font-medium text-foreground">Гомдол шийдвэрлэх</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-destructive text-white">5 шийдэгдээгүй</Badge>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </button>
      </div>

      {/* Recent Bookings */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Сүүлийн захиалгууд</h2>
        <div className="mt-4 rounded-2xl bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Захиалагч</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Ажилтан</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Үйлчилгээ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Төлөв</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Дүн</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((booking, index) => {
                  const status = statusConfig[booking.status as keyof typeof statusConfig]
                  return (
                    <tr
                      key={booking.id}
                      className={index !== recentBookings.length - 1 ? 'border-b border-border' : ''}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{booking.customer}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{booking.worker}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{booking.service}</td>
                      <td className="px-4 py-3">
                        <Badge className={status.className}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                        ₮{booking.amount.toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
