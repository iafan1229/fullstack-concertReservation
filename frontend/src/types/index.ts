export type QueueStatus = 'TEMP' | 'CONFIRMED' | 'CANCELED' | 'EXPIRED'

export interface SignupResponse {
  userId: string
  name: string
}

export interface AuthResponse {
  token: string
  user: {
    userId: string
    name: string
  }
}

export interface QueueTokenResponse {
  queueToken: string
  status: QueueStatus
  position: number
  totalWaiting: number
  estimatedWaitSeconds: number
}

export interface QueueStatusResponse {
  status: QueueStatus
  position: number
  totalWaiting: number
  estimatedWaitSeconds: number
}

export interface ConcertItem {
  id: string
  concertId: string
  concertName: string
  scheduleCount: number
}

export interface ScheduleItem {
  id: string
  startAt: string
  endAt: string
  venue: string | null
  totalSeats: number
  availableSeatCount: number
}

export interface SeatItem {
  id: string
  seatNo: string
  available: boolean
}

export interface BalanceResponse {
  userId: string
  balance: string
}

export interface ReservationItem {
  id: string
  seatNo: string
  status: 'HELD' | 'CONFIRMED' | 'EXPIRED'
  heldAt: string
  expiredAt: string
}
