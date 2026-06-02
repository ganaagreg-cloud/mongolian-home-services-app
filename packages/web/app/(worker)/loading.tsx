import { Skeleton } from '@/components/ui/skeleton'

export default function WorkerLoading() {
  return (
    <main className="mx-auto max-w-[390px] min-h-screen bg-background px-6 pt-12">
      <Skeleton className="h-7 w-36" />
      <div className="mt-6 space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </main>
  )
}
