import { Skeleton } from '@/components/ui/skeleton'

export default function AppLoading() {
  return (
    <main className="mx-auto max-w-[390px] min-h-screen bg-background px-6 pt-12">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <div className="mt-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </main>
  )
}
