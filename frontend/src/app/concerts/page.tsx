'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { ConcertItem } from '@/types'

export default function ConcertsPage() {
  const router = useRouter()
  const [concerts, setConcerts] = useState<ConcertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const queueToken = localStorage.getItem('queueToken')

    if (!token) { router.push('/login'); return }
    if (!queueToken) { router.push('/queue'); return }

    const user = localStorage.getItem('user')
    if (user) setUserName(JSON.parse(user).name)

    api.get<ConcertItem[]>('/api/concerts', undefined, queueToken)
      .then(setConcerts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [router])

  const handleLogout = () => {
    localStorage.clear()
    router.push('/')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080808' }}>
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-8 md:px-16 py-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <Link
          href="/"
          className="text-[10px] tracking-[0.35em] uppercase"
          style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}
        >
          Concert Reservation
        </Link>
        <div className="flex items-center gap-6">
          {userName && (
            <span className="text-[11px] tracking-[0.15em]" style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}>
              {userName}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-[10px] tracking-[0.25em] uppercase hover:text-[#e8a020] transition-colors"
            style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="flex-1 px-8 md:px-16 py-14">
        {/* Title */}
        <div className="mb-12">
          <p
            className="text-[10px] tracking-[0.4em] uppercase mb-3"
            style={{ fontFamily: 'var(--font-mono)', color: '#e8a020' }}
          >
            Step 04 — 콘서트 선택
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-crimson)',
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              fontWeight: 200,
              fontStyle: 'italic',
              letterSpacing: '-0.03em',
              lineHeight: 0.9,
              color: '#ece6de',
            }}
          >
            공연 목록
          </h1>
        </div>

        {/* States */}
        {loading && (
          <p className="text-[11px] tracking-[0.3em] uppercase" style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}>
            불러오는 중...
          </p>
        )}

        {error && (
          <p
            className="text-xs py-3 px-4 max-w-md"
            style={{ fontFamily: 'var(--font-mono)', color: '#e85020', background: 'rgba(232,80,32,0.08)', borderLeft: '2px solid #e85020' }}
          >
            {error}
          </p>
        )}

        {/* Concert grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {concerts.map((concert, i) => (
              <Link
                key={concert.id}
                href={`/concerts/${concert.concertId}/schedules`}
                className="group flex flex-col justify-between p-8 transition-colors"
                style={{ background: '#080808' }}
              >
                {/* Index */}
                <div className="flex items-start justify-between mb-10">
                  <span
                    className="text-[10px] tracking-[0.3em]"
                    style={{ fontFamily: 'var(--font-mono)', color: '#2a2520' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="text-[10px] tracking-[0.25em] uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ fontFamily: 'var(--font-mono)', color: '#e8a020' }}
                  >
                    선택 →
                  </span>
                </div>

                {/* Name */}
                <div>
                  <h2
                    className="mb-4 group-hover:text-[#e8a020] transition-colors"
                    style={{
                      fontFamily: 'var(--font-crimson)',
                      fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                      fontWeight: 300,
                      fontStyle: 'italic',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.1,
                      color: '#ece6de',
                    }}
                  >
                    {concert.concertName}
                  </h2>
                  <p
                    className="text-[10px] tracking-[0.25em] uppercase"
                    style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}
                  >
                    {concert.scheduleCount}회차 운영
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer
        className="flex items-center px-8 md:px-16 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <span className="text-[10px] tracking-[0.25em]" style={{ fontFamily: 'var(--font-mono)', color: '#2a2520' }}>
          콘서트를 선택해 예약 가능한 날짜를 확인하세요
        </span>
      </footer>
    </div>
  )
}
