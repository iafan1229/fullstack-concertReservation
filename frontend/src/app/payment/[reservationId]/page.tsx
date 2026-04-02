'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { PaymentResponse, BalanceResponse } from '@/types'

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

export default function PaymentPage() {
  const router = useRouter()
  const { reservationId } = useParams<{ reservationId: string }>()
  const searchParams = useSearchParams()

  const seatNo = searchParams.get('seatNo') ?? ''
  const amount = searchParams.get('amount') ?? ''
  const expiredAt = searchParams.get('expiredAt') ?? ''

  const grade = getSeatGrade(seatNo)
  const { display: countdown, secondsLeft } = useCountdown(expiredAt || null)

  const [balance, setBalance] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState<PaymentResponse | null>(null)
  const [payError, setPayError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const queueToken = localStorage.getItem('queueToken')
    const userRaw = localStorage.getItem('user')

    if (!token) { router.push('/login'); return }
    if (!queueToken) { router.push('/queue'); return }

    const user = userRaw ? JSON.parse(userRaw) : null
    if (!user) { router.push('/login'); return }

    api.get<BalanceResponse>(`/api/balance?userId=${user.userId}`, token)
      .then((res) => setBalance(res.balance))
      .catch(() => setBalance(null))
  }, [router])

  const handlePay = useCallback(async () => {
    const queueToken = localStorage.getItem('queueToken')
    if (!queueToken) { router.push('/queue'); return }

    setPaying(true)
    setPayError('')

    try {
      const result = await api.post<PaymentResponse>(
        '/api/payments',
        { reservationId },
        undefined,
        queueToken
      )
      setPaid(result)
      localStorage.removeItem('queueToken')
    } catch (err: any) {
      setPayError(err.message ?? '결제 중 오류가 발생했습니다.')
    } finally {
      setPaying(false)
    }
  }, [reservationId, router])

  // 결제 완료 화면
  if (paid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#080808' }}>
        <div className="text-center max-w-md px-8">
          <p
            className="text-[10px] tracking-[0.4em] uppercase mb-6"
            style={{ fontFamily: 'var(--font-mono)', color: '#5a9050' }}
          >
            결제 완료
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-crimson)',
              fontSize: 'clamp(2.2rem, 6vw, 4rem)',
              fontWeight: 200,
              fontStyle: 'italic',
              letterSpacing: '-0.03em',
              lineHeight: 0.95,
              color: '#ece6de',
            }}
          >
            {Number(seatNo)}번 좌석이
            <br />확정되었습니다
          </h1>
          <div
            className="mt-10 py-5 px-6 text-left"
            style={{ background: 'rgba(90,144,80,0.06)', border: '1px solid rgba(90,144,80,0.2)' }}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] tracking-[0.2em]" style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}>좌석</span>
              <span className="text-[13px]" style={{ fontFamily: 'var(--font-mono)', color: '#ece6de' }}>
                {Number(seatNo)}번 ({grade.label})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] tracking-[0.2em]" style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}>결제 금액</span>
              <span className="text-[13px]" style={{ fontFamily: 'var(--font-mono)', color: '#ece6de' }}>
                {Number(paid.amount).toLocaleString('ko-KR')}원
              </span>
            </div>
          </div>
          <Link
            href="/concerts"
            className="inline-block mt-8 px-8 py-3 text-[11px] tracking-[0.2em] uppercase"
            style={{ fontFamily: 'var(--font-mono)', background: '#e8a020', color: '#080808', fontWeight: 500 }}
          >
            콘서트 목록으로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080808' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-8 md:px-16 py-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <button
          onClick={() => router.back()}
          className="text-[10px] tracking-[0.35em] uppercase hover:text-[#e8a020] transition-colors"
          style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}
        >
          ← 좌석 선택
        </button>
        <Link
          href="/concerts"
          className="text-[10px] tracking-[0.25em] uppercase transition-colors hover:text-[#e8a020]"
          style={{ fontFamily: 'var(--font-mono)', color: '#2a2520' }}
        >
          콘서트 목록
        </Link>
      </header>

      <main className="flex-1 px-8 md:px-16 py-14 flex flex-col items-center">
        <div className="w-full max-w-lg">
          {/* Title */}
          <div className="mb-12">
            <p
              className="text-[10px] tracking-[0.4em] uppercase mb-3"
              style={{ fontFamily: 'var(--font-mono)', color: '#e8a020' }}
            >
              Step 07 — 결제
            </p>
            <h1
              style={{
                fontFamily: 'var(--font-crimson)',
                fontSize: 'clamp(2rem, 5vw, 3.8rem)',
                fontWeight: 200,
                fontStyle: 'italic',
                letterSpacing: '-0.03em',
                lineHeight: 0.95,
                color: secondsLeft === 0 ? '#5a5550' : '#ece6de',
              }}
            >
              {secondsLeft === 0 ? '배정이 만료되었습니다' : '결제를 확정하세요'}
            </h1>
          </div>

          {/* Info panel */}
          <div
            className="py-6 px-6 mb-8"
            style={{
              background: secondsLeft === 0 ? 'rgba(232,80,32,0.04)' : '#0d0d0d',
              border: `1px solid ${secondsLeft === 0 ? 'rgba(232,80,32,0.15)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {[
              {
                label: '배정 좌석',
                value: (
                  <span style={{ color: grade.color }}>
                    {Number(seatNo)}번 ({grade.label})
                  </span>
                ),
              },
              {
                label: '결제 금액',
                value: `${Number(amount).toLocaleString('ko-KR')}원`,
              },
              {
                label: '현재 잔액',
                value: balance !== null
                  ? `${Number(balance).toLocaleString('ko-KR')}원`
                  : '—',
              },
              {
                label: '결제 마감',
                value: (
                  <span style={{ color: secondsLeft === 0 ? '#e85020' : secondsLeft <= 60 ? '#e85020' : '#e8a020' }}>
                    {secondsLeft === 0 ? '만료됨' : countdown}
                  </span>
                ),
              },
            ].map(({ label, value }, i) => (
              <div
                key={label}
                className={`flex items-center justify-between py-3 ${i < 3 ? 'border-b' : ''}`}
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              >
                <span className="text-[10px] tracking-[0.2em]" style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}>
                  {label}
                </span>
                <span className="text-[13px]" style={{ fontFamily: 'var(--font-mono)', color: '#ece6de' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Error */}
          {payError && (
            <p
              className="mb-6 text-xs py-3 px-4"
              style={{ fontFamily: 'var(--font-mono)', color: '#e85020', background: 'rgba(232,80,32,0.08)', borderLeft: '2px solid #e85020' }}
            >
              {payError}
            </p>
          )}

          {/* Pay button */}
          <button
            disabled={paying || secondsLeft === 0}
            onClick={handlePay}
            className="w-full py-4 text-[12px] tracking-[0.25em] uppercase transition-opacity"
            style={{
              fontFamily: 'var(--font-mono)',
              background: secondsLeft === 0 ? '#1a1a1a' : paying ? '#6a6020' : '#e8a020',
              color: secondsLeft === 0 ? '#3a3530' : '#080808',
              fontWeight: 500,
              cursor: secondsLeft === 0 || paying ? 'not-allowed' : 'pointer',
              opacity: paying ? 0.7 : 1,
            }}
          >
            {paying ? '결제 중...' : secondsLeft === 0 ? '배정 시간이 만료되었습니다' : '결제 확정하기'}
          </button>
        </div>
      </main>
    </div>
  )
}
