import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { queueAuth } from '../middleware/queueAuth'

export const concertsRouter = Router()

// 모든 라우트에 queueAuth 적용
concertsRouter.use(queueAuth)

// GET /api/concerts — 콘서트 목록
concertsRouter.get('/', async (_req: Request, res: Response) => {
  const concerts = await prisma.concert.findMany({
    include: {
      _count: { select: { schedules: true } },
    },
    orderBy: { id: 'asc' },
  })

  res.json(
    concerts.map((c) => ({
      id: c.id.toString(),
      concertId: c.concertId,
      concertName: c.concertName,
      scheduleCount: c._count.schedules,
    }))
  )
})

// GET /api/concerts/:concertId/schedules — 예약 가능한 날짜 목록
concertsRouter.get('/:concertId/schedules', async (req: Request, res: Response) => {
  const { concertId } = req.params

  const concert = await prisma.concert.findUnique({ where: { concertId } })
  if (!concert) {
    res.status(404).json({ message: '존재하지 않는 콘서트입니다.' })
    return
  }

  const now = new Date()

  const schedules = await prisma.concertSchedule.findMany({
    where: {
      concertId: concert.id,
      endAt: { gt: now }, // 지나지 않은 일정만
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

  res.json(
    schedules.map((s) => ({
      id: s.id.toString(),
      startAt: s.startAt,
      endAt: s.endAt,
      venue: s.venue,
      totalSeats: s.seats.length,
      availableSeatCount: s.seats.filter((seat) => seat.reservations.length === 0).length,
    }))
  )
})

// GET /api/concerts/schedules/:scheduleId/seats — 좌석 목록
concertsRouter.get('/schedules/:scheduleId/seats', async (req: Request, res: Response) => {
  const scheduleId = BigInt(req.params.scheduleId)

  const schedule = await prisma.concertSchedule.findUnique({ where: { id: scheduleId } })
  if (!schedule) {
    res.status(404).json({ message: '존재하지 않는 스케줄입니다.' })
    return
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

  // seatNo를 숫자 기준으로 정렬 (VARCHAR이므로 JS에서 처리)
  seats.sort((a, b) => Number(a.seatNo) - Number(b.seatNo))

  res.json(
    seats.map((seat) => ({
      id: seat.id.toString(),
      seatNo: seat.seatNo,
      available: seat.reservations.length === 0,
    }))
  )
})
