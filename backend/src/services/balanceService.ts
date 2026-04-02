import { prisma } from '../lib/prisma'

async function findUserByUserId(userId: string) {
  const user = await prisma.user.findUnique({ where: { userId } })
  if (!user) {
    throw Object.assign(new Error('존재하지 않는 사용자입니다.'), { statusCode: 404 })
  }
  return user
}

export async function getBalance(userId: string) {
  const user = await findUserByUserId(userId)

  const balance = await prisma.userBalance.findUnique({
    where: { userId: user.id },
  })

  if (!balance) {
    throw Object.assign(new Error('잔액 정보를 찾을 수 없습니다.'), { statusCode: 404 })
  }

  return { userId, balance: balance.balance.toString() }
}

export async function chargeBalance(userId: string, amount: bigint) {
  if (amount <= 0n) {
    throw Object.assign(new Error('충전 금액은 0보다 커야 합니다.'), { statusCode: 400 })
  }

  const user = await findUserByUserId(userId)

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.userBalance.update({
      where: { userId: user.id },
      data: { balance: { increment: amount } },
    })

    await tx.balanceHistory.create({
      data: {
        userId: user.id,
        amount,
        type: 'CHARGE',
      },
    })

    return updated
  })

  return { userId, balance: result.balance.toString() }
}
