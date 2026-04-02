import { prisma } from '../lib/prisma'

export async function confirmPayment(reservationId: bigint, userId: bigint) {
  return prisma.$transaction(async (tx) => {
    // 1. 예약 조회
    const reservation = await tx.reservation.findUnique({
      where: { id: reservationId },
      include: { payment: true },
    })

    if (!reservation) {
      throw Object.assign(new Error('예약을 찾을 수 없습니다.'), { statusCode: 404 })
    }
    if (reservation.userId !== userId) {
      throw Object.assign(new Error('본인의 예약만 결제할 수 있습니다.'), { statusCode: 403 })
    }
    if (reservation.status !== 'HELD') {
      throw Object.assign(new Error('결제 가능한 상태가 아닙니다.'), { statusCode: 400 })
    }
    if (!reservation.payment || reservation.payment.status !== 'PENDING') {
      throw Object.assign(new Error('결제 정보를 찾을 수 없습니다.'), { statusCode: 400 })
    }

    // 2. Reservation → CONFIRMED
    await tx.reservation.update({
      where: { id: reservationId },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    })

    // 3. Payment → SUCCESS
    await tx.payment.update({
      where: { id: reservation.payment.id },
      data: { status: 'SUCCESS', paidAt: new Date() },
    })

    // 4. Queue → EXPIRED (대기열 토큰 만료)
    if (reservation.queueId) {
      await tx.queue.update({
        where: { id: reservation.queueId },
        data: { status: 'EXPIRED' },
      })
    }

    return {
      reservationId: reservationId.toString(),
      paymentId: reservation.payment.id.toString(),
      amount: reservation.payment.amount.toString(),
      status: 'SUCCESS',
      paidAt: new Date(),
    }
  })
}
