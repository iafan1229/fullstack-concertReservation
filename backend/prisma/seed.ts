import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const concerts = [
  { concertId: 'concert-001', concertName: '2026 서울 재즈 페스티벌' },
  { concertId: 'concert-002', concertName: '아이유 HEREH 월드투어' },
  { concertId: 'concert-003', concertName: 'BTS 콘서트 서울' },
  { concertId: 'concert-004', concertName: '뉴진스 팬미팅' },
  { concertId: 'concert-005', concertName: '콜드플레이 내한공연' },
]

const venues = ['올림픽공원 체조경기장', 'KSPO DOME', '잠실종합운동장', '고척스카이돔', '인천 문학경기장']

// 좌석 등급별 가격: VIP(1~10) / R석(11~30) / 일반(31~50)
function getSeatPrice(seatNo: number): bigint {
  if (seatNo <= 10) return 150000n  // VIP
  if (seatNo <= 30) return 100000n  // R석
  return 70000n                      // 일반
}

async function main() {
  console.log('🌱 Seeding...')

  // 중복 실행 방지: 기존 데이터 삭제
  await prisma.payment.deleteMany()
  await prisma.reservation.deleteMany()
  await prisma.seat.deleteMany()
  await prisma.queue.deleteMany()
  await prisma.concertSchedule.deleteMany()
  await prisma.concert.deleteMany()

  for (let i = 0; i < concerts.length; i++) {
    const { concertId, concertName } = concerts[i]
    const venue = venues[i]

    const concert = await prisma.concert.create({
      data: { concertId, concertName },
    })

    // 각 콘서트당 스케줄 2개 (1주 간격)
    const baseDate = new Date('2026-05-01T19:00:00+09:00')
    baseDate.setDate(baseDate.getDate() + i * 3) // 콘서트마다 3일씩 간격

    for (let week = 0; week < 2; week++) {
      const startAt = new Date(baseDate)
      startAt.setDate(startAt.getDate() + week * 7)

      const endAt = new Date(startAt)
      endAt.setHours(endAt.getHours() + 3)

      const schedule = await prisma.concertSchedule.create({
        data: {
          concertId: concert.id,
          startAt,
          endAt,
          venue,
        },
      })

      // 스케줄당 좌석 50개 (1~50), 등급별 가격 적용
      await prisma.seat.createMany({
        data: Array.from({ length: 50 }, (_, idx) => ({
          scheduleId: schedule.id,
          seatNo: String(idx + 1),
          price: getSeatPrice(idx + 1),
        })),
      })

      console.log(`  ✓ ${concertName} — ${startAt.toLocaleDateString('ko-KR')} (좌석 50개)`)
    }
  }

  console.log('\n✅ Seed 완료!')
  console.log(`   콘서트: ${concerts.length}개`)
  console.log(`   스케줄: ${concerts.length * 2}개`)
  console.log(`   좌석:   ${concerts.length * 2 * 50}개`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
