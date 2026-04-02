'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { BalanceResponse } from '@/types'

const QUICK_AMOUNTS = [10000, 30000, 50000, 100000]

function formatKRW(value: number) {
  return value.toLocaleString('ko-KR') + '원'
}

export default function BalancePage() {
  const router = useRouter()

  const [userId, setUserId] = useState('')
  const [balance, setBalance] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [inputAmount, setInputAmount] = useState('')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [charging, setCharging] = useState(false)
  const [chargeError, setChargeError] = useState('')
  const [chargeSuccess, setChargeSuccess] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userRaw = localStorage.getItem('user')

    if (!token || !userRaw) { router.push('/login'); return }

    const user = JSON.parse(userRaw)
    setUserId(user.userId)

    api.get<BalanceResponse>(`/api/balance?userId=${user.userId}`, token)
      .then((res) => setBalance(res.balance))
      .catch((err) => setBalance(null))
      .finally(() => setLoading(false))
  }, [router])

  const finalAmount = selectedAmount ?? (inputAmount ? Number(inputAmount) : 0)

  const handleQuickSelect = (amount: number) => {
    setSelectedAmount(amount)
    setInputAmount('')
    setChargeError('')
    setChargeSuccess('')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedAmount(null)
    setInputAmount(e.target.value.replace(/[^0-9]/g, ''))
    setChargeError('')
    setChargeSuccess('')
  }

  const handleCharge = async () => {
    if (finalAmount <= 0) {
      setChargeError('충전 금액을 선택하거나 입력해주세요.')
      return
    }

    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }

    setCharging(true)
    setChargeError('')
    setChargeSuccess('')

    try {
      const res = await api.patch<BalanceResponse>(
        '/api/balance/charge',
        { userId, amount: finalAmount },
        token
      )
      setBalance(res.balance)
      setSelectedAmount(null)
      setInputAmount('')
      setChargeSuccess(`${formatKRW(finalAmount)} 충전 완료!`)
    } catch (err: any) {
      setChargeError(err.message ?? '충전 중 오류가 발생했습니다.')
    } finally {
      setCharging(false)
    }
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
          ← 돌아가기
        </button>
        <Link
          href="/concerts"
          className="text-[10px] tracking-[0.25em] uppercase hover:text-[#e8a020] transition-colors"
          style={{ fontFamily: 'var(--font-mono)', color: '#2a2520' }}
        >
          콘서트 목록
        </Link>
      </header>

      <main className="flex-1 px-8 md:px-16 py-14 max-w-lg">
        {/* Title */}
        <div className="mb-12">
          <p
            className="text-[10px] tracking-[0.4em] uppercase mb-3"
            style={{ fontFamily: 'var(--font-mono)', color: '#e8a020' }}
          >
            잔액 충전
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
            잔액 충전 / 조회
          </h1>
        </div>

        {/* 현재 잔액 */}
        <div
          className="mb-10 py-6 px-6"
          style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p
            className="text-[10px] tracking-[0.35em] uppercase mb-3"
            style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}
          >
            현재 잔액
          </p>
          {loading ? (
            <p className="text-[11px] tracking-[0.2em]" style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}>
              조회 중...
            </p>
          ) : (
            <p
              style={{
                fontFamily: 'var(--font-crimson)',
                fontSize: '2.8rem',
                fontWeight: 300,
                fontStyle: 'italic',
                color: '#e8a020',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {balance !== null ? Number(balance).toLocaleString('ko-KR') + '원' : '—'}
            </p>
          )}
        </div>

        {/* 충전 금액 선택 */}
        <div className="mb-6">
          <p
            className="text-[10px] tracking-[0.35em] uppercase mb-4"
            style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}
          >
            충전 금액
          </p>

          {/* 빠른 선택 */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {QUICK_AMOUNTS.map((amount) => {
              const isSelected = selectedAmount === amount
              return (
                <button
                  key={amount}
                  onClick={() => handleQuickSelect(amount)}
                  className="py-3 text-[11px] tracking-[0.15em] transition-all"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: isSelected ? 'rgba(232,160,32,0.15)' : '#0d0d0d',
                    color: isSelected ? '#e8a020' : '#4a4540',
                    border: `1px solid ${isSelected ? '#e8a020' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {(amount / 10000)}만원
                </button>
              )
            })}
          </div>

          {/* 직접 입력 */}
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="직접 입력"
              value={inputAmount}
              onChange={handleInputChange}
              className="w-full py-4 px-5 text-[13px] outline-none transition-colors"
              style={{
                fontFamily: 'var(--font-mono)',
                background: '#0d0d0d',
                color: '#ece6de',
                border: `1px solid ${inputAmount ? 'rgba(232,160,32,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}
            />
            {inputAmount && (
              <span
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[11px]"
                style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}
              >
                원
              </span>
            )}
          </div>
        </div>

        {/* 선택된 금액 표시 */}
        {finalAmount > 0 && (
          <div
            className="mb-6 py-3 px-5 flex items-center justify-between"
            style={{ background: 'rgba(232,160,32,0.06)', border: '1px solid rgba(232,160,32,0.15)' }}
          >
            <span className="text-[10px] tracking-[0.2em] uppercase" style={{ fontFamily: 'var(--font-mono)', color: '#5a5550' }}>
              충전 예정
            </span>
            <span
              style={{
                fontFamily: 'var(--font-crimson)',
                fontSize: '1.4rem',
                fontWeight: 300,
                fontStyle: 'italic',
                color: '#e8a020',
              }}
            >
              {formatKRW(finalAmount)}
            </span>
          </div>
        )}

        {/* 에러 / 성공 메시지 */}
        {chargeError && (
          <p
            className="mb-4 py-3 px-4 text-[11px] tracking-[0.15em]"
            style={{ fontFamily: 'var(--font-mono)', color: '#e85020', background: 'rgba(232,80,32,0.08)', borderLeft: '2px solid #e85020' }}
          >
            {chargeError}
          </p>
        )}
        {chargeSuccess && (
          <p
            className="mb-4 py-3 px-4 text-[11px] tracking-[0.15em]"
            style={{ fontFamily: 'var(--font-mono)', color: '#64c864', background: 'rgba(100,200,100,0.08)', borderLeft: '2px solid #64c864' }}
          >
            {chargeSuccess}
          </p>
        )}

        {/* 충전 버튼 */}
        <button
          disabled={charging || finalAmount <= 0}
          onClick={handleCharge}
          className="w-full py-4 text-[12px] tracking-[0.25em] uppercase transition-opacity"
          style={{
            fontFamily: 'var(--font-mono)',
            background: finalAmount > 0 ? '#e8a020' : '#1a1a1a',
            color: finalAmount > 0 ? '#080808' : '#3a3530',
            fontWeight: 500,
            opacity: charging ? 0.7 : 1,
            cursor: charging || finalAmount <= 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {charging ? '충전 중...' : '충전하기'}
        </button>
      </main>

      <footer
        className="flex items-center px-8 md:px-16 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <span className="text-[10px] tracking-[0.25em]" style={{ fontFamily: 'var(--font-mono)', color: '#2a2520' }}>
          충전한 잔액으로 예약 결제를 진행할 수 있습니다
        </span>
      </footer>
    </div>
  )
}
