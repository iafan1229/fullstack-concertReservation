import { Router, Request, Response } from 'express'
import { z } from 'zod'
import * as authService from '../services/authService'

export const authRouter = Router()

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

  try {
    const result = await authService.signup(email, password, name)
    res.status(201).json(result)
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message })
  }
})

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: '입력값이 올바르지 않습니다.' })
    return
  }

  const { email, password } = parsed.data

  try {
    const result = await authService.login(email, password)
    res.json(result)
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message })
  }
})
