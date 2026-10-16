import { cn } from '@/lib/utils'

// HomeService logo: a ger (yurt) with a saffron toono (crown ring).
// Inline SVG on purpose — it is the brand asset, not an icon (icons stay lucide-react).
export function GerGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M3 12.5c2.4-3.9 5.5-6.2 9-6.2s6.6 2.3 9 6.2" />
      <path d="M4.6 11.6v7.9h14.8v-7.9" />
      <path d="M10.4 19.5v-4.2h3.2v4.2" />
      <circle cx="12" cy="6.3" r="1.3" className="fill-highlight" stroke="none" />
    </svg>
  )
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="HomeService"
      className={cn('flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] bg-primary text-primary-foreground shadow-brand', className)}
    >
      <GerGlyph className="h-6 w-6" />
    </span>
  )
}
