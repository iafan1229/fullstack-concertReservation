import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Concert Reservation',
  description: '콘서트 예약 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
