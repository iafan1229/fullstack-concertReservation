import { prisma } from './prisma'

const MAX_ACTIVE = 5           // 동시 활성 최대 인원
const INTERVAL_MS = 10_000    // 10초 간격
const CONFIRMED_TTL_MS = 10 * 60 * 1000  // CONFIRMED 유효 시간 10분

export function startQueueScheduler() {
  setInterval(async () => {
    try {
      // 1. 만료 처리: CONFIRMED 상태에서 10분 초과한 항목 → EXPIRED
      const expireThreshold = new Date(Date.now() - CONFIRMED_TTL_MS)
      const expired = await prisma.queue.updateMany({
        where: {
          status: 'CONFIRMED',
          confirmedAt: { lt: expireThreshold },
        },
        data: { status: 'EXPIRED' },
      })
      if (expired.count > 0) {
        console.log(`[Queue] ${expired.count}명 만료 처리 (EXPIRED)`)
      }

      // 2. 현재 CONFIRMED 수 확인
      const confirmedCount = await prisma.queue.count({
        where: { status: 'CONFIRMED' },
      })

      const slots = MAX_ACTIVE - confirmedCount
      if (slots <= 0) return

      // 3. 가장 오래 기다린 TEMP 유저 선택 (선착순)
      const toActivate = await prisma.queue.findMany({
        where: { status: 'TEMP' },
        orderBy: { enteredAt: 'asc' },
        take: slots,
        select: { id: true },
      })
      if (toActivate.length === 0) return

      // 4. CONFIRMED로 일괄 업데이트 + confirmedAt 기록
      await prisma.queue.updateMany({
        where: { id: { in: toActivate.map((q) => q.id) } },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      })

      console.log(`[Queue] ${toActivate.length}명 활성화 (CONFIRMED: ${confirmedCount + toActivate.length}/${MAX_ACTIVE})`)
    } catch (err) {
      console.error('[Queue Scheduler Error]', err)
    }
  }, INTERVAL_MS)

  console.log(`[Queue] 스케줄러 시작 — ${INTERVAL_MS / 1000}초 간격, 최대 ${MAX_ACTIVE}명`)
}
