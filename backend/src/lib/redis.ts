import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

redis.on('connect', () => {
  console.log('[Redis] 연결 성공')
})

redis.on('error', (err) => {
  console.error('[Redis] 연결 오류:', err.message)
})

export { redis }
