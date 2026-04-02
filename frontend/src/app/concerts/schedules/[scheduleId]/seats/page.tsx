'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { SeatItem, ReservationItem } from '@/types'

function getSeatGrade(seatNo: string) {
  const n = Number(seatNo)
  if (n <= 10) return { label: 'VIP', color: '#9060d0' }
  if (n <= 30) return { label: 'R석', color: '#e8a020' }
  return { label: '일반', color: '#3a9878' }
}

function useCountdown(expiredAt: string | null) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0)

  useEffect(() => {
    if (!expiredAt) return
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(expiredAt).getTime() - Date.now()) / 1000))
      setSecondsLeft(diff)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [expiredAt])

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  return { display: `${mm}:${ss}`, secondsLeft }
}

export default function SeatsPage() {
  const router = useRouter()
  const { scheduleId } = useParams<{ scheduleId: string }>()

  const [seats, setSeats] = useState<SeatItem[]>([])
  const [selected, setSelected] = useState<SeatItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [reserving, setReserving] = useState(false)
  const [reservation, setReservation] = useState<ReservationItem | null>(null)
  const [reserveError, setReserveError] = useState('')

  const { display: countdown, secondsLeft } = useCountdown(reservation?.expiredAt ?? null)

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

  const handleReserve = useCallback(async () => {
    if (!selected) return
    const queueToken = localStorage.getItem('queueToken')
    if (!queueToken) { router.push('/queue'); return }

    setReserving(true)
    setReserveError('')

    try {
      const result = await api.post<ReservationItem>(
        '/api/reservations',
        { scheduleId, seatNo: selected.seatNo },
        undefined,
        queueToken
      )
      setReservation(result)
      // 해당 좌석을 예약 불가로 표시
      setSeats((prev) =>
        prev.map((s) => (s.id === selected.id ? { ...s, available: false } : s))
      )
    } catch (err: any) {
      setReserveError(err.message ?? '예약 중 오류가 발생했습니다.')
    } finally {
      setReserving(false)
    }
  }, [selected, scheduleId, router])

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
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-8">
              {[
                { color: '#9060d0', label: 'VIP · 150,000원' },
                { color: '#e8a020', label: 'R석 · 100,000원' },
                { color: '#3a9878', label: '일반 · 70,000원' },
                { color: '#1e1e1e', label: '예약 불가', border: 'rgba(255,255,255,0.06)' },
              ].map(({ color, label, border }) => (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4"
                    style={{ background: color, border: `1px solid ${border || color}` }}
                  />
                  <span className="text-[10px] tracking-[0.15em]" style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}>
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
                const isReserved = reservation?.seatNo === seat.seatNo
                const grade = getSeatGrade(seat.seatNo)
                return (
                  <button
                    key={seat.id}
                    disabled={!seat.available || !!reservation}
                    onClick={() => setSelected(isSelected ? null : seat)}
                    className="aspect-square flex items-center justify-center text-[10px] transition-all"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      background: isReserved
                        ? 'rgba(100,200,100,0.15)'
                        : isSelected
                        ? `${grade.color}22`
                        : seat.available
                        ? grade.color
                        : '#111111',
                      color: isReserved
                        ? '#64c864'
                        : isSelected
                        ? grade.color
                        : seat.available
                        ? '#fff'
                        : '#2a2520',
                      border: isReserved
                        ? '1px solid #64c864'
                        : isSelected
                        ? `1px solid ${grade.color}`
                        : seat.available
                        ? 'none'
                        : '1px solid rgba(255,255,255,0.04)',
                      cursor: seat.available && !reservation ? 'pointer' : 'not-allowed',
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

            {/* Reservation success panel */}
            {reservation && (
              <div
                className="w-full max-w-2xl mx-auto mt-10 py-6 px-6"
                style={{
                  background: secondsLeft > 0 ? 'rgba(100,200,100,0.05)' : 'rgba(232,80,32,0.05)',
                  border: `1px solid ${secondsLeft > 0 ? 'rgba(100,200,100,0.2)' : 'rgba(232,80,32,0.2)'}`,
                }}
              >
                <p
                  className="text-[10px] tracking-[0.35em] uppercase mb-4"
                  style={{ fontFamily: 'var(--font-mono)', color: secondsLeft > 0 ? '#64c864' : '#e85020' }}
                >
                  {secondsLeft > 0 ? '임시 배정 완료' : '임시 배정 만료'}
                </p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] tracking-[0.2em] mb-1" style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}>
                      배정된 좌석
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-crimson)',
                        fontSize: '2rem',
                        fontWeight: 300,
                        fontStyle: 'italic',
                        color: '#ece6de',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {Number(reservation.seatNo)}번 좌석
                    </p>
                  </div>
                  {secondsLeft > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] tracking-[0.2em] mb-1" style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}>
                        결제 마감까지
                      </p>
                      <p
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '2rem',
                          color: secondsLeft <= 60 ? '#e85020' : '#e8a020',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {countdown}
                      </p>
                    </div>
                  )}
                </div>
                {secondsLeft > 0 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-[10px] tracking-[0.15em]" style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}>
                      결제를 완료하지 않으면 배정이 자동으로 해제됩니다
                    </p>
                    <button
                      onClick={() => router.push(`/payment/${reservation.id}?seatNo=${reservation.seatNo}&amount=${reservation.amount}&expiredAt=${encodeURIComponent(reservation.expiredAt)}`)}
                      className="px-5 py-2 text-[11px] tracking-[0.2em] uppercase"
                      style={{ fontFamily: 'var(--font-mono)', background: '#e8a020', color: '#080808', fontWeight: 500 }}
                    >
                      결제하기 →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Selected seat panel */}
            {!reservation && (
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
                        {getSeatGrade(selected.seatNo).label} · {Number(selected.price).toLocaleString('ko-KR')}원
                      </p>
                      <p
                        style={{
                          fontFamily: 'var(--font-crimson)',
                          fontSize: '1.8rem',
                          fontWeight: 300,
                          fontStyle: 'italic',
                          color: getSeatGrade(selected.seatNo).color,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {Number(selected.seatNo)}번 좌석
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {reserveError && (
                        <p className="text-[10px] tracking-[0.15em]" style={{ fontFamily: 'var(--font-mono)', color: '#e85020' }}>
                          {reserveError}
                        </p>
                      )}
                      <button
                        disabled={reserving}
                        onClick={handleReserve}
                        className="px-6 py-3 text-[11px] tracking-[0.2em] uppercase transition-opacity"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          background: reserving ? '#6a6020' : '#e8a020',
                          color: '#080808',
                          fontWeight: 500,
                          opacity: reserving ? 0.7 : 1,
                          cursor: reserving ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {reserving ? '예약 중...' : '이 좌석 예약하기'}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] tracking-[0.2em]" style={{ fontFamily: 'var(--font-mono)', color: '#2a2520' }}>
                    좌석을 선택하면 예약 정보가 표시됩니다
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
