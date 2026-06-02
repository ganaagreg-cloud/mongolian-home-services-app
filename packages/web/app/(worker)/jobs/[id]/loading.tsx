import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pt-12 pb-32">
      <Skeleton className="h-6 w-36" />
      <Skeleton className="mt-1 h-4 w-24" />
      <div className="mt-6 rounded-2xl bg-card p-4 shadow-sm space-y-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-11 w-full rounded-2xl" />
      </div>
      <div className="mt-4 rounded-2xl bg-card p-4 shadow-sm space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="mt-6 h-36 w-full rounded-2xl" />
      <Skeleton className="mt-6 h-14 w-full rounded-2xl" />
    </div>
  )
}
