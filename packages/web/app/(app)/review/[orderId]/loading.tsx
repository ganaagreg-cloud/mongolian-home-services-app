import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pt-12">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="mt-6 flex flex-col items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-5 w-48" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-full" />
          ))}
        </div>
      </div>
      <Skeleton className="mt-6 h-24 rounded-2xl" />
      <Skeleton className="mt-4 h-12 rounded-2xl" />
    </div>
  )
}
