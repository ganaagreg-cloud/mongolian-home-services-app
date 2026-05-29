import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HomeService Admin',
  description: 'Нүүр үйлчилгээний платформ — Администраторын самбар',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className="bg-background">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
