import { Router, Request, Response } from 'express'
import { queueAuth } from '../middleware/queueAuth'
import * as concertService from '../services/concertService'

export const concertsRouter = Router()

concertsRouter.use(queueAuth)

// GET /api/concerts — 콘서트 목록
concertsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await concertService.getConcerts()
    res.json(result)
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message })
  }
})

// GET /api/concerts/:concertId/schedules — 예약 가능한 날짜 목록
concertsRouter.get('/:concertId/schedules', async (req: Request, res: Response) => {
  try {
    const result = await concertService.getSchedules(req.params.concertId)
    res.json(result)
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message })
  }
})

// GET /api/concerts/schedules/:scheduleId/seats — 좌석 목록
concertsRouter.get('/schedules/:scheduleId/seats', async (req: Request, res: Response) => {
  try {
    const result = await concertService.getSeats(BigInt(req.params.scheduleId))
    res.json(result)
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message })
  }
})
