import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/authMiddleware'
import * as balanceService from '../services/balanceService'

export const balanceRouter = Router()

balanceRouter.use(authMiddleware)

// GET /api/balance?userId=xxx — 잔액 조회
balanceRouter.get('/', async (req: Request, res: Response) => {
  const { userId } = req.query

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ message: 'userId는 필수입니다.' })
    return
  }

  // 본인 잔액만 조회 가능
  if (userId !== (req as any).user.userId) {
    res.status(403).json({ message: '본인의 잔액만 조회할 수 있습니다.' })
    return
  }

  try {
    const result = await balanceService.getBalance(userId)
    res.json(result)
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message })
  }
})

// PATCH /api/balance/charge — 잔액 충전
balanceRouter.patch('/charge', async (req: Request, res: Response) => {
  const { userId, amount } = req.body

  if (!userId) {
    res.status(400).json({ message: 'userId는 필수입니다.' })
    return
  }

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    res.status(400).json({ message: '올바른 충전 금액을 입력해주세요.' })
    return
  }

  // 본인 잔액만 충전 가능
  if (userId !== (req as any).user.userId) {
    res.status(403).json({ message: '본인의 잔액만 충전할 수 있습니다.' })
    return
  }

  try {
    const result = await balanceService.chargeBalance(userId, BigInt(amount))
    res.json(result)
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message })
  }
})
