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
  price: string
  available: boolean
}

export interface BalanceResponse {
  userId: string
  balance: string
}

export interface ReservationItem {
  id: string
  seatNo: string
  amount: string
  status: 'HELD' | 'CONFIRMED' | 'EXPIRED'
  heldAt: string
  expiredAt: string
}

export interface ReservationDetail {
  id: string
  status: 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELED'
  seatNo: string
  amount: string
  heldAt: string
  expiredAt: string | null
  confirmedAt: string | null
  concertName: string
  startAt: string
  venue: string | null
}

export interface PaymentResponse {
  reservationId: string
  paymentId: string
  seatId: string
  amount: string
  status: 'SUCCESS'
  paidAt: string
}
