'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { SeatItem } from '@/types'

export default function SeatsPage() {
  const router = useRouter()
  const { scheduleId } = useParams<{ scheduleId: string }>()

  const [seats, setSeats] = useState<SeatItem[]>([])
  const [selected, setSelected] = useState<SeatItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const queueToken = localStorage.getItem('queueToken')

    if (!token) { router.push('/login'); return }
    if (!queueToken) { router.push('/queue'); return }

    api.get<SeatItem[]>(`/api/concerts/schedules/${scheduleId}/seats`, undefined, queueToken)
      .then(setSeats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [router, scheduleId])

  const availableCount = seats.filter((s) => s.available).length

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080808' }}>
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-8 md:px-16 py-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <button
          onClick={() => router.back()}
          className="text-[10px] tracking-[0.35em] uppercase hover:text-[#e8a020] transition-colors"
          style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}
        >
          ← 날짜 선택
        </button>
        <Link
          href="/concerts"
          className="text-[10px] tracking-[0.25em] uppercase transition-colors hover:text-[#e8a020]"
          style={{ fontFamily: 'var(--font-mono)', color: '#2a2520' }}
        >
          콘서트 목록
        </Link>
      </header>

      <main className="flex-1 px-8 md:px-16 py-14">
        {/* Title */}
        <div className="mb-12">
          <p
            className="text-[10px] tracking-[0.4em] uppercase mb-3"
            style={{ fontFamily: 'var(--font-mono)', color: '#e8a020' }}
          >
            Step 06 — 좌석 선택
          </p>
          <h1
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
            좌석을 선택하세요
          </h1>
          {!loading && !error && (
            <p className="mt-3 text-[11px] tracking-[0.2em]" style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}>
              총 {seats.length}석 중 {availableCount}석 예약 가능
            </p>
          )}
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

        {!loading && !error && (
          <>
            {/* Legend */}
            <div className="flex items-center gap-6 mb-8">
              {[
                { color: '#e8a020', label: '예약 가능' },
                { color: '#1e1e1e', label: '예약 불가', border: 'rgba(255,255,255,0.06)' },
                { color: 'rgba(232,160,32,0.15)', label: '선택됨', border: '#e8a020' },
              ].map(({ color, label, border }) => (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className="w-5 h-5"
                    style={{ background: color, border: `1px solid ${border || color}` }}
                  />
                  <span className="text-[10px] tracking-[0.2em]" style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Stage indicator */}
            <div
              className="w-full max-w-2xl mx-auto mb-8 py-2 text-center text-[10px] tracking-[0.4em] uppercase"
              style={{
                fontFamily: 'var(--font-mono)',
                color: '#2a2520',
                background: '#0d0d0d',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              STAGE
            </div>

            {/* Seat grid — 10 columns × 5 rows */}
            <div className="w-full max-w-2xl mx-auto grid gap-2" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
              {seats.map((seat) => {
                const isSelected = selected?.id === seat.id
                return (
                  <button
                    key={seat.id}
                    disabled={!seat.available}
                    onClick={() => setSelected(isSelected ? null : seat)}
                    className="aspect-square flex items-center justify-center text-[10px] transition-all"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      background: isSelected
                        ? 'rgba(232,160,32,0.15)'
                        : seat.available
                        ? '#e8a020'
                        : '#111111',
                      color: isSelected ? '#e8a020' : seat.available ? '#080808' : '#2a2520',
                      border: isSelected ? '1px solid #e8a020' : seat.available ? 'none' : '1px solid rgba(255,255,255,0.04)',
                      cursor: seat.available ? 'pointer' : 'not-allowed',
                      fontWeight: 500,
                    }}
                  >
                    {seat.seatNo}
                  </button>
                )
              })}
            </div>

            {/* Row labels */}
            <div className="w-full max-w-2xl mx-auto mt-2 grid" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
              {['A', 'B', 'C', 'D', 'E'].map((row) =>
                Array.from({ length: 10 }, (_, col) => (
                  <span
                    key={`${row}${col}`}
                    className="text-center text-[8px]"
                    style={{ fontFamily: 'var(--font-mono)', color: '#1e1e1e' }}
                  >
                    {row}
                  </span>
                ))
              )}
            </div>

            {/* Selected seat panel */}
            <div
              className="w-full max-w-2xl mx-auto mt-10 flex items-center justify-between py-5 px-6 transition-all"
              style={{
                background: selected ? 'rgba(232,160,32,0.06)' : '#0d0d0d',
                border: `1px solid ${selected ? 'rgba(232,160,32,0.2)' : 'rgba(255,255,255,0.05)'}`,
              }}
            >
              {selected ? (
                <>
                  <div>
                    <p className="text-[10px] tracking-[0.3em] uppercase mb-1" style={{ fontFamily: 'var(--font-mono)', color: '#5a5550' }}>
                      선택한 좌석
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-crimson)',
                        fontSize: '1.8rem',
                        fontWeight: 300,
                        fontStyle: 'italic',
                        color: '#e8a020',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {Number(selected.seatNo)}번 좌석
                    </p>
                  </div>
                  <button
                    className="px-6 py-3 text-[11px] tracking-[0.2em] uppercase"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      background: '#e8a020',
                      color: '#080808',
                      fontWeight: 500,
                    }}
                    onClick={() => alert(`${selected.seatNo}번 좌석 예약 기능은 다음 단계에서 구현됩니다.`)}
                  >
                    이 좌석 예약하기
                  </button>
                </>
              ) : (
                <p className="text-[11px] tracking-[0.2em]" style={{ fontFamily: 'var(--font-mono)', color: '#2a2520' }}>
                  좌석을 선택하면 예약 정보가 표시됩니다
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
