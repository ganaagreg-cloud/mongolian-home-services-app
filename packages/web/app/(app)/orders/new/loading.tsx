import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pt-12">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="mt-6 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-1.5 flex-1 rounded-full" />
        ))}
      </div>
      <Skeleton className="mt-6 h-5 w-32" />
      <div className="mt-3 grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
