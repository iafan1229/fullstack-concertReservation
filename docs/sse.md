# SSE (Server-Sent Events) 전환 계획

## 현재 — 클라이언트 폴링

```
프론트 (queue/page.tsx)
  setInterval(pollStatus, 3000)
  → 3초마다 GET /api/queue/status
  → 서버가 Redis에서 순번 조회 후 응답
  → 변화 없어도 반복
```

### 문제점
- 변화 없을 때도 3초마다 요청 발생
- 승격 후 최대 3초 지연
- 유저 10,000명 → 초당 3,333 요청

---

## 변경 후 — SSE + Redis Pub/Sub

```
프론트: EventSource 연결 열어놓음 (요청 1회)
스케줄러: 승격 시 Redis Pub/Sub으로 발행
서버: 구독 중인 해당 유저 연결에 즉시 푸시
```

### 흐름

```
1. 프론트 → GET /api/queue/stream (SSE 연결)
2. 서버: 연결 유지, Redis SUBSCRIBE queue:events:{userId}
3. 스케줄러: TEMP→CONFIRMED 승격 시
   → Redis PUBLISH queue:events:{userId} '{"status":"CONFIRMED"}'
4. 서버: 메시지 수신 → SSE로 프론트에 즉시 전달
5. 프론트: onmessage로 수신 → 화면 업데이트
```

---

## 수정 대상 파일

| 파일 | 변경 |
|---|---|
| `backend/src/routes/queue.ts` | `GET /api/queue/stream` SSE 엔드포인트 추가 |
| `backend/src/lib/scheduler.ts` | 승격/만료 시 Redis Pub/Sub 발행 추가 |
| `frontend/src/app/queue/page.tsx` | `setInterval` 폴링 → `EventSource` 교체 |

---

## 백엔드

### routes/queue.ts — SSE 엔드포인트 추가

```typescript
// GET /api/queue/stream — SSE 연결
queueRouter.get('/stream', authMiddleware, async (req, res) => {
  const { id } = (req as any).user
  const channel = `queue:events:${id}`

  // SSE 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // Redis 구독용 별도 클라이언트 (Pub/Sub은 전용 연결 필요)
  const sub = redis.duplicate()
  await sub.subscribe(channel)

  sub.on('message', (_channel, message) => {
    res.write(`data: ${message}\n\n`)
  })

  // 연결 종료 시 정리
  req.on('close', () => {
    sub.unsubscribe(channel)
    sub.quit()
  })
})
```

### scheduler.ts — 승격 시 Pub/Sub 발행 추가

```typescript
// 기존 승격 로직 뒤에 추가
for (const userId of toActivate) {
  await redis.publish(
    `queue:events:${userId}`,
    JSON.stringify({ status: 'CONFIRMED', position: 0, totalWaiting: 0 })
  )
}
```

### 주기적 순번 업데이트 (선택)

TEMP 상태 유저에게도 순번 변화를 푸시:

```typescript
// 스케줄러에서 승격 처리 후
const remaining = await redis.zrange(QUEUE_WAITING, 0, -1)
for (let i = 0; i < remaining.length; i++) {
  await redis.publish(
    `queue:events:${remaining[i]}`,
    JSON.stringify({ status: 'TEMP', position: i, totalWaiting: remaining.length })
  )
}
```

---

## 프론트엔드

### queue/page.tsx — EventSource로 교체

현재:
```typescript
// 3초마다 폴링
intervalRef.current = setInterval(pollStatus, 3000)
```

변경 후:
```typescript
const source = new EventSource(`${API_URL}/api/queue/stream`, {
  // auth 헤더가 필요하므로 fetch 기반 SSE 또는 쿼리 파라미터로 토큰 전달
})

source.onmessage = (event) => {
  const data = JSON.parse(event.data)
  setQueueInfo(data)

  if (data.status === 'CONFIRMED') {
    setPhase('confirmed')
    localStorage.setItem('queueToken', queueTokenRef.current!)
    source.close()
  }
}

source.onerror = () => {
  setPhase('error')
  setErrorMsg('연결이 끊어졌습니다.')
  source.close()
}
```

### EventSource 인증 문제

`EventSource`는 커스텀 헤더(Authorization)를 지원하지 않음.
해결 방법: 쿼리 파라미터로 토큰 전달

```typescript
const source = new EventSource(
  `${API_URL}/api/queue/stream?token=${encodeURIComponent(token)}`
)
```

서버에서:
```typescript
const token = req.query.token as string
// JWT 검증 후 userId 추출
```

---

## 폴링 vs SSE 비교 (이 프로젝트 기준)

| | 폴링 (현재) | SSE (변경 후) |
|---|---|---|
| 요청 수 (유저 1만명) | 초당 3,333회 | 0회 (연결 유지만) |
| 상태 반영 속도 | 최대 3초 지연 | 즉시 |
| 서버 부하 | 요청마다 Redis 조회 | 변화 시에만 Pub/Sub |
| 연결 수 | 없음 (stateless) | 유저 수만큼 유지 |
| 구현 복잡도 | 낮음 | 중간 (Pub/Sub + 연결 관리) |

---

## 주의사항

1. **Pub/Sub 전용 연결**: Redis Pub/Sub은 SUBSCRIBE 후 다른 명령 사용 불가 → `redis.duplicate()`로 별도 연결 생성
2. **연결 정리**: 프론트가 페이지 떠나면 `req.on('close')` 에서 구독 해제 필수 (메모리 누수 방지)
3. **재연결**: `EventSource`는 연결 끊기면 자동 재연결 시도 (브라우저 내장)
4. **로드 밸런서**: sticky session 필요 (SSE 연결이 특정 인스턴스에 유지돼야 함)
