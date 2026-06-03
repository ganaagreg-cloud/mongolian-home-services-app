import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">
      <div className="flex items-center gap-4 px-6 pt-12">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <Skeleton className="h-6 w-36" />
      </div>
      <div className="mt-6 flex flex-col items-center gap-3">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="mt-6 space-y-4 px-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
