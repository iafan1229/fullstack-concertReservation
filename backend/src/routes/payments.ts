import { Router, Request, Response } from 'express'
import { queueAuth } from '../middleware/queueAuth'
import * as paymentService from '../services/paymentService'

export const paymentsRouter = Router()

paymentsRouter.use(queueAuth)

// POST /api/payments — 결제 확정
paymentsRouter.post('/', async (req: Request, res: Response) => {
  const { reservationId } = req.body
  const queue = (req as any).queue

  if (!reservationId) {
    res.status(400).json({ message: 'reservationId는 필수입니다.' })
    return
  }

  try {
    const result = await paymentService.confirmPayment(
      BigInt(reservationId),
      queue.userId
    )
    res.status(200).json(result)
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message })
  }
})
