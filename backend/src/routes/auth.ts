import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { randomUUID } from 'crypto'

export const authRouter = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  name: z.string().min(1),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// POST /api/auth/signup
authRouter.post('/signup', async (req: Request, res: Response) => {
  const parsed = signupSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: '입력값이 올바르지 않습니다.', errors: parsed.error.flatten() })
    return
  }

  const { email, password, name } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ message: '이미 사용 중인 이메일입니다.' })
    return
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

  res.status(201).json({ userId: user.userId, name: user.name })
})

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: '입력값이 올바르지 않습니다.' })
    return
  }

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    return
  }

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    return
  }

  const token = jwt.sign(
    { id: user.id.toString(), userId: user.userId },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.json({ token, user: { userId: user.userId, name: user.name } })
})
