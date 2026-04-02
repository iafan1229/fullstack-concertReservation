import { prisma } from '../lib/prisma'

const HELD_DURATION_MS = 5 * 60 * 1000 // 5분

export async function createReservation(
  scheduleId: bigint,
  seatNo: string,
  queue: { id: bigint; userId: bigint }
) {
  return prisma.$transaction(async (tx) => {
    const seat = await tx.seat.findFirst({
      where: { scheduleId, seatNo },
    })

    if (!seat) {
      throw Object.assign(new Error('존재하지 않는 좌석입니다.'), { statusCode: 404 })
    }

    const existing = await tx.reservation.findFirst({
      where: {
        seatId: seat.id,
        status: { in: ['HELD', 'CONFIRMED'] },
      },
    })

    if (existing) {
      throw Object.assign(new Error('이미 예약된 좌석입니다.'), { statusCode: 409 })
    }

    const now = new Date()
    const expiredAt = new Date(now.getTime() + HELD_DURATION_MS)

    const reservation = await tx.reservation.create({
      data: {
        userId: queue.userId,
        seatId: seat.id,
        queueId: queue.id,
        status: 'HELD',
        heldAt: now,
        expiredAt,
      },
      include: {
        seat: { select: { seatNo: true } },
      },
    })

    return {
      id: reservation.id.toString(),
      seatNo: reservation.seat.seatNo,
      status: reservation.status,
      heldAt: reservation.heldAt,
      expiredAt: reservation.expiredAt,
    }
  })
}
