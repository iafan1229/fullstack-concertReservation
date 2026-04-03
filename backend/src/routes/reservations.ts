import { Router, Request, Response } from 'express'
import { queueAuth } from '../middleware/queueAuth'
import { authMiddleware } from '../middleware/authMiddleware'
import * as reservationService from '../services/reservationService'

export const reservationsRouter = Router()

// GET /api/reservations — 내 예약 목록
reservationsRouter.get('/', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user
  try {
    const result = await reservationService.getUserReservations(BigInt(user.id))
    res.status(200).json(result)
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message })
  }
})

// PATCH /api/reservations/:id/cancel — 예약 취소
reservationsRouter.patch('/:id/cancel', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params
  const user = (req as any).user
  try {
    const result = await reservationService.cancelReservation(BigInt(id), BigInt(user.id))
    res.status(200).json(result)
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message })
  }
})

// POST /api/reservations — 좌석 임시 예약
reservationsRouter.post('/', queueAuth, async (req: Request, res: Response) => {
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
