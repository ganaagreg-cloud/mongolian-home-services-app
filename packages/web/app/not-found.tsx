import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[390px] flex-col items-center justify-center gap-4 px-6">
      <p className="text-center text-sm text-muted-foreground">
        Хуудас олдсонгүй.
      </p>
      <Link href="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        Нүүр хуудас руу буцах
      </Link>
    </main>
  )
}
