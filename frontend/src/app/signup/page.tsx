'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { api } from '@/lib/api'
import type { SignupResponse } from '@/types'

const schema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(4, '비밀번호는 4자 이상이어야 합니다'),
})

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const parsed = schema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.errors[0].message)
      return
    }

    setLoading(true)
    try {
      await api.post<SignupResponse>('/api/auth/signup', parsed.data)
      router.push('/login?from=signup')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#080808' }}
    >
      {/* Left panel — decorative */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16"
        style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        <Link
          href="/"
          className="text-[10px] tracking-[0.35em] uppercase"
          style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}
        >
          ← Concert Reservation
        </Link>

        <div>
          <p
            className="text-[10px] tracking-[0.4em] uppercase mb-6"
            style={{ fontFamily: 'var(--font-mono)', color: '#e8a020' }}
          >
            Step 01
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-crimson)',
              fontSize: '5.5rem',
              fontWeight: 200,
              fontStyle: 'italic',
              lineHeight: 0.9,
              letterSpacing: '-0.03em',
              color: '#ece6de',
            }}
          >
            Create
            <br />
            <span style={{ color: '#e8a020' }}>account.</span>
          </h2>
          <p
            className="mt-8 leading-relaxed"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#4a4540', maxWidth: '280px' }}
          >
            회원가입 후 대기열 토큰을 발급받아
            <br />
            콘서트 좌석을 예약할 수 있습니다.
          </p>
        </div>

        <span
          style={{
            fontFamily: 'var(--font-crimson)',
            fontSize: '9rem',
            fontWeight: 200,
            fontStyle: 'italic',
            color: 'rgba(232,160,32,0.05)',
            lineHeight: 1,
          }}
        >
          01
        </span>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20">
        <div className="w-full max-w-sm mx-auto lg:mx-0">

          {/* Mobile back link */}
          <Link
            href="/"
            className="lg:hidden inline-block mb-12 text-[10px] tracking-[0.35em] uppercase"
            style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}
          >
            ← 홈
          </Link>

          <p
            className="text-[10px] tracking-[0.35em] uppercase mb-2"
            style={{ fontFamily: 'var(--font-mono)', color: '#e8a020' }}
          >
            Sign Up
          </p>
          <h1
            className="mb-10"
            style={{
              fontFamily: 'var(--font-crimson)',
              fontSize: '2.2rem',
              fontWeight: 300,
              fontStyle: 'italic',
              color: '#ece6de',
              letterSpacing: '-0.02em',
            }}
          >
            새 계정 만들기
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            {(['name', 'email', 'password'] as const).map((field) => (
              <div key={field} className="flex flex-col gap-2">
                <label
                  htmlFor={field}
                  className="text-[10px] tracking-[0.3em] uppercase"
                  style={{ fontFamily: 'var(--font-mono)', color: '#5a5550' }}
                >
                  {field === 'name' ? '이름' : field === 'email' ? '이메일' : '비밀번호'}
                </label>
                <input
                  id={field}
                  type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  value={form[field]}
                  onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                  className="w-full bg-transparent py-3 text-sm outline-none transition-colors placeholder-[#2a2520]"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: '#ece6de',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '13px',
                  }}
                  placeholder={field === 'name' ? '홍길동' : field === 'email' ? 'hello@email.com' : '••••••••'}
                  autoComplete={field === 'password' ? 'new-password' : field}
                />
              </div>
            ))}

            {error && (
              <p
                className="text-xs py-3 px-4"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: '#e85020',
                  background: 'rgba(232,80,32,0.08)',
                  borderLeft: '2px solid #e85020',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 py-4 text-[11px] tracking-[0.25em] uppercase transition-opacity disabled:opacity-40"
              style={{
                fontFamily: 'var(--font-mono)',
                background: '#e8a020',
                color: '#080808',
                fontWeight: 500,
              }}
            >
              {loading ? '처리 중...' : '계정 생성하기'}
            </button>
          </form>

          <p
            className="mt-8 text-center"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#3a3530' }}
          >
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="hover:text-[#e8a020] transition-colors" style={{ color: '#5a5550' }}>
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
