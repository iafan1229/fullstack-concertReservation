import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#080808' }}>
      {/* Noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          opacity: 0.025,
        }}
      />

      {/* Top bar */}
      <header className="relative flex items-center justify-between px-8 md:px-16 pt-8">
        <span
          className="text-[10px] tracking-[0.35em] uppercase"
          style={{ fontFamily: 'var(--font-mono)', color: '#3a3530' }}
        >
          Concert Reservation
        </span>
        <div className="flex gap-6">
          <Link
            href="/login"
            className="text-[11px] tracking-[0.2em] uppercase transition-colors"
            style={{ fontFamily: 'var(--font-mono)', color: '#5a5550' }}
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="text-[11px] tracking-[0.2em] uppercase transition-colors hover:text-[#e8a020]"
            style={{ fontFamily: 'var(--font-mono)', color: '#5a5550' }}
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="relative flex-1 flex flex-col justify-center px-8 md:px-16 pb-24">
        <p
          className="text-[10px] tracking-[0.4em] uppercase mb-10 animate-fade-up"
          style={{
            fontFamily: 'var(--font-mono)',
            color: '#e8a020',
            animationDelay: '0.1s',
            opacity: 0,
          }}
        >
          Queue-based Ticketing System
        </p>

        <h1
          className="animate-fade-up"
          style={{
            fontFamily: 'var(--font-crimson)',
            fontSize: 'clamp(3.5rem, 11vw, 9.5rem)',
            fontWeight: 200,
            fontStyle: 'italic',
            lineHeight: 0.88,
            letterSpacing: '-0.03em',
            color: '#ece6de',
            animationDelay: '0.2s',
            opacity: 0,
          }}
        >
          Reserve
          <br />
          <span style={{ color: '#e8a020' }}>your seat.</span>
        </h1>

        <div
          className="w-full h-px my-10 animate-fade-up"
          style={{
            background: 'rgba(255,255,255,0.06)',
            animationDelay: '0.35s',
            opacity: 0,
          }}
        />

        <div
          className="flex items-center gap-8 animate-fade-up"
          style={{ animationDelay: '0.45s', opacity: 0 }}
        >
          <Link
            href="/signup"
            className="inline-flex items-center gap-3 px-7 py-3.5 text-[11px] tracking-[0.2em] uppercase transition-all hover:gap-5"
            style={{
              fontFamily: 'var(--font-mono)',
              background: '#e8a020',
              color: '#080808',
              fontWeight: 500,
            }}
          >
            시작하기
            <span>→</span>
          </Link>
          <Link
            href="/login"
            className="text-[11px] tracking-[0.2em] uppercase transition-colors hover:text-[#e8a020]"
            style={{ fontFamily: 'var(--font-mono)', color: '#5a5550' }}
          >
            이미 계정이 있어요
          </Link>
        </div>

        {/* Decorative number */}
        <div
          className="absolute right-8 md:right-16 bottom-8 text-right select-none pointer-events-none"
          style={{
            fontFamily: 'var(--font-crimson)',
            fontSize: 'clamp(8rem, 22vw, 18rem)',
            fontWeight: 200,
            fontStyle: 'italic',
            color: 'rgba(232,160,32,0.04)',
            lineHeight: 1,
            letterSpacing: '-0.05em',
          }}
        >
          01
        </div>
      </div>

      {/* Bottom bar */}
      <footer
        className="relative flex items-center justify-between px-8 md:px-16 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <span
          className="text-[10px] tracking-[0.25em]"
          style={{ fontFamily: 'var(--font-mono)', color: '#2a2520' }}
        >
          v0.1.0
        </span>
        <span
          className="text-[10px] tracking-[0.25em]"
          style={{ fontFamily: 'var(--font-mono)', color: '#2a2520' }}
        >
          대기열 기반 예약 시스템
        </span>
      </footer>
    </main>
  )
}
