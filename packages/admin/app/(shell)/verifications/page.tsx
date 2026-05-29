import { ShieldCheck } from 'lucide-react'

export default function VerificationsPage() {
  return (
    <div className="px-8 pt-8">
      <h1 className="text-xl font-bold text-foreground">Баталгаажуулалтууд</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ажилтны DAN болон цагдаагийн тодорхойлолт хүлээгдэж байна
      </p>

      <div className="mt-6 flex flex-col items-center justify-center rounded-2xl bg-card py-16 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <ShieldCheck className="h-8 w-8 text-success" />
        </div>
        <p className="mt-4 font-semibold text-foreground">Хүлээгдэж буй баталгаажуулалт байхгүй</p>
        <p className="mt-1 text-sm text-muted-foreground">Шинэ хүсэлт ирэхэд энд харагдана</p>
      </div>
    </div>
  )
}
