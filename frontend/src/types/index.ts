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
  estimatedWaitSeconds: number
}

export interface QueueStatusResponse {
  status: QueueStatus
  position: number
  estimatedWaitSeconds: number
}
