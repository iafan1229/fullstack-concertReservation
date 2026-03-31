import type { Metadata } from 'next'
import { Crimson_Pro, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const crimson = Crimson_Pro({
  subsets: ['latin'],
  weight: ['200', '300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-crimson',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Concert Reservation',
  description: '콘서트 예약 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${crimson.variable} ${mono.variable}`}>
      <body className="bg-[#080808] text-[#ece6de] antialiased">{children}</body>
    </html>
  )
}
