import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <div className="flex items-center justify-between px-6 pt-12">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-40 rounded-full" />
      </div>
      <div className="mt-4 flex gap-1 px-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-14 flex-1 rounded-2xl" />
        ))}
      </div>
      <div className="mt-3 flex gap-4 px-6">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-3 w-24 rounded-full" />)}
      </div>
      <div className="mt-4 space-y-3 px-6">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
      </div>
    </div>
  )
}
