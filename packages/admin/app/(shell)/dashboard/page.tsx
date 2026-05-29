import { Users, ClipboardList, AlertTriangle, ShieldCheck } from 'lucide-react'

const stats = [
  { label: 'Нийт хэрэглэгч',          value: '—', icon: Users,          color: 'text-primary',     bg: 'bg-primary/10'     },
  { label: 'Идэвхтэй захиалга',        value: '—', icon: ClipboardList,  color: 'text-success',     bg: 'bg-success/10'     },
  { label: 'Хүлээгдэж буй маргаан',    value: '—', icon: AlertTriangle,  color: 'text-accent',      bg: 'bg-accent/10'      },
  { label: 'Шинэ баталгаажуулалт',     value: '—', icon: ShieldCheck,    color: 'text-primary',     bg: 'bg-primary/10'     },
]

export default function DashboardPage() {
  return (
    <div className="px-8 pt-8">
      <h1 className="text-xl font-bold text-foreground">Хянах самбар</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-2xl bg-card p-5 shadow-sm">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-foreground">Сүүлийн идэвхжил</h2>
        <p className="mt-4 text-sm text-muted-foreground">Удахгүй боломжтой болно</p>
      </div>
    </div>
  )
}
