import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pt-12">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-5 w-40" />
      </div>
      <Skeleton className="mt-6 h-28 rounded-2xl" />
      <Skeleton className="mt-6 h-5 w-32" />
      <div className="mt-4 space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
