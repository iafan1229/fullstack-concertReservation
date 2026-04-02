import { prisma } from '../lib/prisma'

export async function getConcerts() {
  const concerts = await prisma.concert.findMany({
    include: {
      _count: { select: { schedules: true } },
    },
    orderBy: { id: 'asc' },
  })

  return concerts.map((c) => ({
    id: c.id.toString(),
    concertId: c.concertId,
    concertName: c.concertName,
    scheduleCount: c._count.schedules,
  }))
}

export async function getSchedules(concertId: string) {
  const concert = await prisma.concert.findUnique({ where: { concertId } })
  if (!concert) {
    throw Object.assign(new Error('존재하지 않는 콘서트입니다.'), { statusCode: 404 })
  }

  const now = new Date()
  const schedules = await prisma.concertSchedule.findMany({
    where: {
      concertId: concert.id,
      endAt: { gt: now },
    },
    include: {
      seats: {
        include: {
          reservations: {
            where: { status: { in: ['HELD', 'CONFIRMED'] } },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { startAt: 'asc' },
  })

  return schedules.map((s) => ({
    id: s.id.toString(),
    startAt: s.startAt,
    endAt: s.endAt,
    venue: s.venue,
    totalSeats: s.seats.length,
    availableSeatCount: s.seats.filter((seat) => seat.reservations.length === 0).length,
  }))
}

export async function getSeats(scheduleId: bigint) {
  const schedule = await prisma.concertSchedule.findUnique({ where: { id: scheduleId } })
  if (!schedule) {
    throw Object.assign(new Error('존재하지 않는 스케줄입니다.'), { statusCode: 404 })
  }

  const seats = await prisma.seat.findMany({
    where: { scheduleId },
    include: {
      reservations: {
        where: { status: { in: ['HELD', 'CONFIRMED'] } },
        select: { id: true },
      },
    },
  })

  seats.sort((a, b) => Number(a.seatNo) - Number(b.seatNo))

  return seats.map((seat) => ({
    id: seat.id.toString(),
    seatNo: seat.seatNo,
    price: seat.price.toString(),
    available: seat.reservations.length === 0,
  }))
}
