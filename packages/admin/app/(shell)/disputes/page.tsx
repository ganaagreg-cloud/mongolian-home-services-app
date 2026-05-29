import { Scale } from 'lucide-react'

export default function DisputesPage() {
  return (
    <div className="px-8 pt-8">
      <h1 className="text-xl font-bold text-foreground">Маргаанууд</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Хэрэглэгч болон ажилтны хоорондох маргаан
      </p>

      <div className="mt-6 flex flex-col items-center justify-center rounded-2xl bg-card py-16 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Scale className="h-8 w-8 text-primary" />
        </div>
        <p className="mt-4 font-semibold text-foreground">Идэвхтэй маргаан байхгүй</p>
        <p className="mt-1 text-sm text-muted-foreground">Шинэ маргаан ирэхэд энд харагдана</p>
      </div>
    </div>
  )
}
