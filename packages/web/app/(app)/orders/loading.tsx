import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <div className="flex items-center gap-4 px-6 pt-12">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="mt-6 px-6">
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
      <div className="mt-4 space-y-3 px-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-card p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Skeleton className="h-12 w-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-24 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
