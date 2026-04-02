import { Router, Request, Response } from 'express'
import { queueAuth } from '../middleware/queueAuth'
import * as reservationService from '../services/reservationService'

export const reservationsRouter = Router()

reservationsRouter.use(queueAuth)

// POST /api/reservations — 좌석 임시 예약
reservationsRouter.post('/', async (req: Request, res: Response) => {
  const { scheduleId, seatNo } = req.body

  if (!scheduleId || !seatNo) {
    res.status(400).json({ message: 'scheduleId와 seatNo는 필수입니다.' })
    return
  }

  const queue = (req as any).queue

  try {
    const result = await reservationService.createReservation(
      BigInt(scheduleId),
      String(seatNo),
      { id: queue.id, userId: queue.userId }
    )
    res.status(201).json(result)
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message })
  }
})
