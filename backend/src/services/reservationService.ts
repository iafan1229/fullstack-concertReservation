import { prisma } from '../lib/prisma'

const HELD_DURATION_MS = 5 * 60 * 1000 // 5분

export async function createReservation(
  scheduleId: bigint,
  seatNo: string,
  queue: { id: bigint; userId: bigint }
) {
  return prisma.$transaction(async (tx) => {
    // 1. 좌석 조회
    const seat = await tx.seat.findFirst({
      where: { scheduleId, seatNo },
    })
    if (!seat) {
      throw Object.assign(new Error('존재하지 않는 좌석입니다.'), { statusCode: 404 })
    }

    // 2. 중복 예약 확인
    const existing = await tx.reservation.findFirst({
      where: {
        seatId: seat.id,
        status: { in: ['HELD', 'CONFIRMED'] },
      },
    })
    if (existing) {
      throw Object.assign(new Error('이미 예약된 좌석입니다.'), { statusCode: 409 })
    }

    // 3. 잔액 확인
    const userBalance = await tx.userBalance.findUnique({
      where: { userId: queue.userId },
    })
    if (!userBalance || userBalance.balance < seat.price) {
      throw Object.assign(new Error('잔액이 부족합니다.'), { statusCode: 400 })
    }

    // 4. 잔액 차감
    await tx.userBalance.update({
      where: { userId: queue.userId },
      data: { balance: { decrement: seat.price } },
    })

    // 5. 잔액 사용 이력
    await tx.balanceHistory.create({
      data: { userId: queue.userId, amount: seat.price, type: 'USE' },
    })

    // 6. 예약 생성 (HELD)
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
      include: { seat: { select: { seatNo: true } } },
    })

    // 7. Payment 생성 (PENDING)
    await tx.payment.create({
      data: {
        reservationId: reservation.id,
        amount: seat.price,
        status: 'PENDING',
      },
    })

    return {
      id: reservation.id.toString(),
      seatNo: reservation.seat.seatNo,
      status: reservation.status,
      amount: seat.price.toString(),
      heldAt: reservation.heldAt,
      expiredAt: reservation.expiredAt,
    }
  })
}
