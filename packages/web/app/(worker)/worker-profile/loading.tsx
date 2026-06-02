import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <div className="px-6 pt-12">
        <Skeleton className="h-6 w-24" />
      </div>
      {/* Profile card */}
      <div className="mx-6 mt-6 flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      {/* Stats */}
      <div className="mx-6 mt-4 grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
      {/* Specialty card */}
      <Skeleton className="mx-6 mt-4 h-20 rounded-2xl" />
      {/* Availability toggle */}
      <Skeleton className="mx-6 mt-4 h-16 rounded-2xl" />
      {/* Banking section */}
      <Skeleton className="mx-6 mt-6 h-32 rounded-2xl" />
      {/* Menu */}
      <div className="mx-6 mt-6 overflow-hidden rounded-2xl bg-card shadow-sm">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}
