import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">
      <div className="flex items-center gap-4 px-6 pt-12">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="mt-6 mx-6 rounded-2xl bg-card p-5 shadow-md">
        <Skeleton className="h-3 w-24 mb-4" />
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>
      <div className="mt-4 mx-6 h-32 rounded-2xl bg-card animate-pulse shadow-sm" />
      <div className="mt-4 mx-6 h-24 rounded-2xl bg-card animate-pulse shadow-sm" />
    </div>
  )
}
