'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { ScheduleItem } from '@/types'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function SchedulesPage() {
  const router = useRouter()
  const { concertId } = useParams<{ concertId: string }>()

  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [concertName, setConcertName] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const queueToken = localStorage.getItem('queueToken')

    if (!token) { router.push('/login'); return }
    if (!queueToken) { router.push('/queue'); return }

    // concertName은 concerts 목록에서 저장해두지 않았으므로 concertId를 표시
    setConcertName(decodeURIComponent(concertId))

    api.get<ScheduleItem[]>(`/api/concerts/${concertId}/schedules`, undefined, queueToken)
      .then(setSchedules)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [router, concertId])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080808' }}>
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-8 md:px-16 py-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <Link
          href="/concerts"
          className="text-[10px] tracking-[0.35em] uppercase hover:text-[#e8a020] transition-colors"
          style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}
        >
          ← 콘서트 목록
        </Link>
      </header>

      <main className="flex-1 px-8 md:px-16 py-14">
        <div className="mb-12">
          <p
            className="text-[10px] tracking-[0.4em] uppercase mb-3"
            style={{ fontFamily: 'var(--font-mono)', color: '#e8a020' }}
          >
            Step 05 — 날짜 선택
          </p>
          <h1
            className="mb-1"
            style={{
              fontFamily: 'var(--font-crimson)',
              fontSize: 'clamp(2rem, 5vw, 3.8rem)',
              fontWeight: 200,
              fontStyle: 'italic',
              letterSpacing: '-0.03em',
              lineHeight: 0.95,
              color: '#ece6de',
            }}
          >
            예약 가능한 날짜
          </h1>
          <p
            className="mt-3 text-[11px] tracking-[0.2em]"
            style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}
          >
            {concertName}
          </p>
        </div>

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

        {!loading && !error && schedules.length === 0 && (
          <p className="text-[11px]" style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}>
            예약 가능한 일정이 없습니다.
          </p>
        )}

        {/* Schedule list */}
        {!loading && !error && schedules.length > 0 && (
          <div className="flex flex-col" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {schedules.map((schedule, i) => {
              const soldOut = schedule.availableSeatCount === 0
              return (
                <Link
                  key={schedule.id}
                  href={soldOut ? '#' : `/concerts/schedules/${schedule.id}/seats`}
                  className={`group flex items-center gap-8 py-7 transition-colors ${soldOut ? 'pointer-events-none opacity-40' : ''}`}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  {/* Index */}
                  <span
                    className="hidden md:block text-[10px] tracking-[0.25em] w-6 shrink-0"
                    style={{ fontFamily: 'var(--font-mono)', color: '#2a2520' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  {/* Date */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="mb-1 group-hover:text-[#e8a020] transition-colors"
                      style={{
                        fontFamily: 'var(--font-crimson)',
                        fontSize: '1.5rem',
                        fontWeight: 300,
                        fontStyle: 'italic',
                        color: '#ece6de',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {formatDate(schedule.startAt)}
                    </p>
                    <p className="text-[11px] tracking-[0.2em]" style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}>
                      {formatTime(schedule.startAt)} — {formatTime(schedule.endAt)}
                      {schedule.venue && <span className="ml-4">{schedule.venue}</span>}
                    </p>
                  </div>

                  {/* Seats remaining */}
                  <div className="text-right shrink-0">
                    <p
                      className="text-[11px] tracking-[0.2em]"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: soldOut ? '#5a5550' : schedule.availableSeatCount < 10 ? '#e85020' : '#e8a020',
                      }}
                    >
                      {soldOut ? '매진' : `잔여 ${schedule.availableSeatCount}석`}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ fontFamily: 'var(--font-mono)', color: '#2a2520' }}>
                      총 {schedule.totalSeats}석
                    </p>
                  </div>

                  {/* Arrow */}
                  <span
                    className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ fontFamily: 'var(--font-mono)', color: '#e8a020' }}
                  >
                    →
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
