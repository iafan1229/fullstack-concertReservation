'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { ReservationDetail } from '@/types'

const STATUS_LABEL: Record<ReservationDetail['status'], string> = {
  CONFIRMED: '예약 확정',
  HELD: '임시 배정',
  EXPIRED: '만료',
  CANCELED: '취소됨',
}

const STATUS_COLOR: Record<ReservationDetail['status'], string> = {
  CONFIRMED: '#5a9050',
  HELD: '#e8a020',
  EXPIRED: '#3a3530',
  CANCELED: '#3a3530',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ReservationsPage() {
  const router = useRouter()
  const [reservations, setReservations] = useState<ReservationDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }

    api.get<ReservationDetail[]>('/api/reservations', token)
      .then(setReservations)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [router])

  const handleCancel = useCallback(async (id: string) => {
    if (!window.confirm('예약을 취소하시겠습니까? 결제 금액이 환불됩니다.')) return

    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }

    setCancelingId(id)
    try {
      await api.patch(`/api/reservations/${id}/cancel`, {}, token)
      setReservations((prev) =>
        prev.map((r) => r.id === id ? { ...r, status: 'CANCELED' as const } : r)
      )
    } catch (err: any) {
      alert(err.message ?? '취소 중 오류가 발생했습니다.')
    } finally {
      setCancelingId(null)
    }
  }, [router])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080808' }}>
      {/* Header */}
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
        {/* Title */}
        <div className="mb-12">
          <p
            className="text-[10px] tracking-[0.4em] uppercase mb-3"
            style={{ fontFamily: 'var(--font-mono)', color: '#e8a020' }}
          >
            내 예약
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
            예약 목록
          </h1>
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

        {!loading && !error && reservations.length === 0 && (
          <p className="text-[11px] tracking-[0.2em]" style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}>
            예약 내역이 없습니다.
          </p>
        )}

        {!loading && !error && reservations.length > 0 && (
          <div className="max-w-2xl flex flex-col gap-4">
            {reservations.map((r) => {
              const canCancel = r.status === 'CONFIRMED' || r.status === 'HELD'
              const isCanceling = cancelingId === r.id
              return (
                <div
                  key={r.id}
                  className="py-5 px-6"
                  style={{
                    background: r.status === 'CANCELED' ? '#0a0a0a' : '#0d0d0d',
                    border: `1px solid ${r.status === 'CANCELED' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)'}`,
                  }}
                >
                  {/* 상단: 콘서트명 + 상태 배지 */}
                  <div className="flex items-start justify-between mb-3">
                    <p
                      style={{
                        fontFamily: 'var(--font-crimson)',
                        fontSize: '1.4rem',
                        fontWeight: 300,
                        fontStyle: 'italic',
                        letterSpacing: '-0.02em',
                        color: r.status === 'CANCELED' ? '#3a3530' : '#ece6de',
                      }}
                    >
                      {r.concertName}
                    </p>
                    <span
                      className="text-[10px] tracking-[0.25em] uppercase ml-4 mt-1 shrink-0"
                      style={{ fontFamily: 'var(--font-mono)', color: STATUS_COLOR[r.status] }}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>

                  {/* 상세 정보 */}
                  <div className="flex flex-col gap-1 mb-4">
                    <p className="text-[11px] tracking-[0.15em]" style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}>
                      {formatDate(r.startAt)}{r.venue ? ` · ${r.venue}` : ''}
                    </p>
                    <p className="text-[11px] tracking-[0.15em]" style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}>
                      {Number(r.seatNo)}번 좌석 · {Number(r.amount).toLocaleString('ko-KR')}원
                    </p>
                  </div>

                  {/* 취소 버튼 */}
                  {canCancel && (
                    <button
                      disabled={isCanceling}
                      onClick={() => handleCancel(r.id)}
                      className="text-[10px] tracking-[0.25em] uppercase transition-colors"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: isCanceling ? '#3a3530' : '#e85020',
                        cursor: isCanceling ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isCanceling ? '취소 중...' : '취소하기'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
