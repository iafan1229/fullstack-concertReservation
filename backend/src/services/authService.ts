import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export async function signup(email: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw Object.assign(new Error('이미 사용 중인 이메일입니다.'), { statusCode: 409 })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const userId = randomUUID()

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { userId, email, password: hashedPassword, name },
    })
    await tx.userBalance.create({
      data: { userId: newUser.id, balance: 0n },
    })
    return newUser
  })

  return { userId: user.userId, name: user.name }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw Object.assign(new Error('이메일 또는 비밀번호가 올바르지 않습니다.'), { statusCode: 401 })
  }

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    throw Object.assign(new Error('이메일 또는 비밀번호가 올바르지 않습니다.'), { statusCode: 401 })
  }

  const token = jwt.sign(
    { id: user.id.toString(), userId: user.userId },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  return { token, user: { userId: user.userId, name: user.name } }
}
