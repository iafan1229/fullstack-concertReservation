import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

// Auth JWT 검증 (로그인 토큰)
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    res.status(401).json({ message: '인증 토큰이 없습니다.' })
    return
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    ;(req as any).user = payload
    next()
  } catch {
    res.status(401).json({ message: '유효하지 않거나 만료된 토큰입니다.' })
  }
}
