import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <div className="px-6 pt-12">
        <Skeleton className="h-6 w-36" />
      </div>
      {/* Instant section */}
      <div className="mt-6 px-6 space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="rounded-2xl bg-card p-4 shadow-sm space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-1.5 w-full rounded-full" />
          <div className="flex gap-3">
            <Skeleton className="h-12 flex-1 rounded-2xl" />
            <Skeleton className="h-12 flex-1 rounded-2xl" />
          </div>
        </div>
      </div>
      {/* Scheduled section */}
      <div className="mt-8 px-6 space-y-3">
        <Skeleton className="h-5 w-40" />
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
