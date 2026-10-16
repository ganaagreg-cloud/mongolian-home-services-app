import type { Metadata, Viewport } from 'next'
import { Manrope } from 'next/font/google'
import Script from 'next/script'
import { Providers } from './providers'
import './globals.css'

// Manrope covers Mongolian Cyrillic (Ө ө Ү ү live in cyrillic-ext).
const manrope = Manrope({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HomeService - Гэрийн үйлчилгээний платформ',
  description: 'Монголын гэрийн үйлчилгээний платформ - аюулгүй, хурдан, найдвартай',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HomeService',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#F3F5F2',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="mn" className={`${manrope.variable} bg-background`}>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }`}
        </Script>
      </body>
    </html>
  )
}
