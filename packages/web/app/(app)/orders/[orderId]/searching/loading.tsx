export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="relative flex h-32 w-32 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-accent/10">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
        </div>
      </div>
      <p className="mt-8 text-xl font-bold text-foreground">Ачааллаж байна...</p>
    </div>
  )
}
