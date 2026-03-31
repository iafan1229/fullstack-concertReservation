'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { QueueTokenResponse, QueueStatusResponse, QueueStatus } from '@/types'

const STATUS_LABEL: Record<QueueStatus, string> = {
  TEMP: '대기 중',
  CONFIRMED: '입장 가능',
  CANCELED: '취소됨',
  EXPIRED: '만료됨',
}

const STATUS_COLOR: Record<QueueStatus, string> = {
  TEMP: '#e8a020',
  CONFIRMED: '#5a9050',
  CANCELED: '#5a5550',
  EXPIRED: '#5a5550',
}

type Phase = 'idle' | 'polling' | 'confirmed' | 'error'

export default function QueuePage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [queueInfo, setQueueInfo] = useState<QueueStatusResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const queueTokenRef = useRef<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    const user = localStorage.getItem('user')
    if (user) setUserName(JSON.parse(user).name)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [router])

  const pollStatus = useCallback(async () => {
    const qt = queueTokenRef.current
    if (!qt) return
    try {
      const res = await api.get<QueueStatusResponse>('/api/queue/status', undefined, qt)
      setQueueInfo(res)
      if (res.status === 'CONFIRMED') {
        setPhase('confirmed')
        localStorage.setItem('queueToken', qt)
        if (intervalRef.current) clearInterval(intervalRef.current)
      } else if (res.status === 'CANCELED' || res.status === 'EXPIRED') {
        setPhase('error')
        setErrorMsg('대기열이 만료되었습니다. 다시 시도해주세요.')
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    } catch {
      // 폴링 실패는 무시하고 재시도
    }
  }, [])

  const handleEnterQueue = async () => {
    setErrorMsg('')
    setLoading(true)

    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }

    try {
      const res = await api.post<QueueTokenResponse>('/api/queue/token', {}, token)
      queueTokenRef.current = res.queueToken
      setQueueInfo({ status: res.status, position: res.position, estimatedWaitSeconds: res.estimatedWaitSeconds })

      if (res.status === 'CONFIRMED') {
        setPhase('confirmed')
        localStorage.setItem('queueToken', res.queueToken)
      } else {
        setPhase('polling')
        intervalRef.current = setInterval(pollStatus, 3000)
      }
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

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
            <span
              className="text-[11px] tracking-[0.15em]"
              style={{ fontFamily: 'var(--font-mono)', color: '#4a4540' }}
            >
              {userName}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-[10px] tracking-[0.25em] uppercase transition-colors hover:text-[#e8a020]"
            style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 py-16">

        {/* IDLE */}
        {phase === 'idle' && (
          <div className="w-full max-w-md text-center animate-fade-up">
            <p
              className="text-[10px] tracking-[0.4em] uppercase mb-4"
              style={{ fontFamily: 'var(--font-mono)', color: '#e8a020' }}
            >
              Step 03
            </p>
            <h1
              className="mb-4"
              style={{
                fontFamily: 'var(--font-crimson)',
                fontSize: '3.5rem',
                fontWeight: 200,
                fontStyle: 'italic',
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
                color: '#ece6de',
              }}
            >
              대기열 입장
            </h1>
            <p
              className="mb-10"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#4a4540' }}
            >
              버튼을 눌러 서비스 대기열에 참여하세요.
              <br />
              순서가 되면 콘서트 예약을 진행할 수 있습니다.
            </p>

            {errorMsg && (
              <p
                className="mb-6 text-xs py-3 px-4 text-left"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: '#e85020',
                  background: 'rgba(232,80,32,0.08)',
                  borderLeft: '2px solid #e85020',
                }}
              >
                {errorMsg}
              </p>
            )}

            <button
              onClick={handleEnterQueue}
              disabled={loading}
              className="w-full py-4 text-[11px] tracking-[0.25em] uppercase transition-opacity disabled:opacity-40"
              style={{
                fontFamily: 'var(--font-mono)',
                background: '#e8a020',
                color: '#080808',
                fontWeight: 500,
              }}
            >
              {loading ? '처리 중...' : '대기열 입장하기'}
            </button>
          </div>
        )}

        {/* POLLING / CONFIRMED */}
        {(phase === 'polling' || phase === 'confirmed') && queueInfo && (
          <div className="w-full max-w-lg text-center animate-fade-up">
            {/* Status badge */}
            <div className="flex items-center justify-center gap-2 mb-10">
              <span
                className="animate-pulse-dot inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: STATUS_COLOR[queueInfo.status] }}
              />
              <span
                className="text-[10px] tracking-[0.4em] uppercase"
                style={{ fontFamily: 'var(--font-mono)', color: STATUS_COLOR[queueInfo.status] }}
              >
                {STATUS_LABEL[queueInfo.status]}
              </span>
            </div>

            {phase === 'polling' ? (
              <>
                <div className="relative mb-4">
                  <p
                    className="text-[10px] tracking-[0.4em] uppercase mb-2"
                    style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}
                  >
                    현재 대기 순서
                  </p>
                  <span
                    className="animate-count-in inline-block"
                    key={queueInfo.position}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'clamp(5rem, 18vw, 10rem)',
                      fontWeight: 300,
                      color: '#e8a020',
                      lineHeight: 1,
                      letterSpacing: '-0.04em',
                    }}
                  >
                    {queueInfo.position === 0 ? '곧 입장' : queueInfo.position}
                  </span>
                  <p
                    className="mt-2 text-[10px] tracking-[0.3em] uppercase"
                    style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}
                  >
                    {queueInfo.position === 0 ? '처리 중...' : `${queueInfo.estimatedWaitSeconds}초 예상`}
                  </p>
                </div>
                <div className="w-24 h-px mx-auto my-8" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#3a3530' }}>
                  3초마다 자동으로 갱신됩니다
                </p>
              </>
            ) : (
              /* CONFIRMED */
              <>
                <div className="mb-8">
                  <span
                    style={{
                      fontFamily: 'var(--font-crimson)',
                      fontSize: 'clamp(3rem, 10vw, 6rem)',
                      fontWeight: 200,
                      fontStyle: 'italic',
                      color: '#5a9050',
                      letterSpacing: '-0.03em',
                      lineHeight: 0.9,
                    }}
                  >
                    입장 완료!
                  </span>
                  <p
                    className="mt-4"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#4a4540' }}
                  >
                    서비스를 이용할 수 있습니다.
                  </p>
                </div>
                <Link
                  href="/concerts"
                  className="inline-block px-8 py-4 text-[11px] tracking-[0.25em] uppercase"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: '#5a9050',
                    color: '#ece6de',
                    fontWeight: 500,
                  }}
                >
                  좌석 예약하러 가기 →
                </Link>
              </>
            )}

            <button
              onClick={() => {
                if (intervalRef.current) clearInterval(intervalRef.current)
                setPhase('idle')
                setQueueInfo(null)
                queueTokenRef.current = null
              }}
              className="block mx-auto mt-10 text-[10px] tracking-[0.25em] uppercase transition-colors hover:text-[#e8a020]"
              style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}
            >
              처음으로
            </button>
          </div>
        )}

        {/* ERROR */}
        {phase === 'error' && (
          <div className="w-full max-w-md text-center animate-fade-up">
            <p
              className="text-xs py-3 px-4 mb-8"
              style={{
                fontFamily: 'var(--font-mono)',
                color: '#e85020',
                background: 'rgba(232,80,32,0.08)',
                borderLeft: '2px solid #e85020',
              }}
            >
              {errorMsg}
            </p>
            <button
              onClick={() => { setPhase('idle'); setErrorMsg('') }}
              className="py-4 px-8 text-[11px] tracking-[0.25em] uppercase"
              style={{
                fontFamily: 'var(--font-mono)',
                background: '#e8a020',
                color: '#080808',
                fontWeight: 500,
              }}
            >
              다시 시도
            </button>
          </div>
        )}

      </main>

      <footer
        className="flex items-center justify-between px-8 md:px-16 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <span
          className="text-[10px] tracking-[0.25em]"
          style={{ fontFamily: 'var(--font-mono)', color: '#2a2520' }}
        >
          대기열 토큰은 10분간 유효합니다
        </span>
      </footer>
    </div>
  )
}
