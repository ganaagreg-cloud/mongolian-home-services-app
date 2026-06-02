import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pt-12">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="mt-6 flex items-start gap-4 rounded-2xl bg-card p-5 shadow-md">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="mt-4 h-10 w-36 rounded-2xl" />
      <Skeleton className="mt-6 h-48 rounded-2xl" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
    </div>
  )
}
