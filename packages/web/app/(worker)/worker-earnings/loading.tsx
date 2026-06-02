import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <div className="px-6 pt-12">
        <Skeleton className="h-6 w-20" />
      </div>
      {/* Balance card skeleton */}
      <div className="mx-6 mt-6 rounded-2xl bg-primary/20 p-6 shadow-lg">
        <Skeleton className="h-4 w-24 bg-primary-foreground/20" />
        <Skeleton className="mt-2 h-9 w-40 bg-primary-foreground/20" />
        <Skeleton className="mt-4 h-4 w-48 bg-primary-foreground/20" />
      </div>
      {/* Summary cards */}
      <div className="mx-6 mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card p-4 shadow-sm space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-sm space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
      </div>
      {/* Transactions */}
      <div className="mx-6 mt-6 space-y-3">
        <Skeleton className="h-5 w-32" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
