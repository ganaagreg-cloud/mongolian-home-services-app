import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center gap-4 border-b border-border px-6 pt-12 pb-4">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <div className="mx-6 mt-4">
        <Skeleton className="h-10 w-full rounded-2xl" />
      </div>
      <div className="flex-1 space-y-3 px-6 py-4">
        <div className="flex justify-start gap-2">
          <Skeleton className="h-8 w-8 rounded-full shrink-0 self-end" />
          <Skeleton className="h-12 w-48 rounded-2xl rounded-bl-sm" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-40 rounded-2xl rounded-br-sm" />
        </div>
        <div className="flex justify-start gap-2">
          <Skeleton className="h-8 w-8 rounded-full shrink-0 self-end" />
          <Skeleton className="h-12 w-56 rounded-2xl rounded-bl-sm" />
        </div>
      </div>
    </div>
  )
}
