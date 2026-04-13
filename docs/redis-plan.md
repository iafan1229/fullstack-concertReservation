# Redis 도입 실행 계획

## 현재 대기열이 DB를 쓰는 곳 정리

| 위치 | DB 호출 | 용도 |
|---|---|---|
| `queueService.getOrCreateToken()` | `queue.create`, `queue.count` × 2 | 입장 + 순번 조회 |
| `queueService.getStatus()` | `queue.findUnique`, `queue.count` × 2 | 폴링마다 3회 쿼리 |
| `scheduler.ts` | `queue.updateMany`, `queue.count`, `queue.findMany` | 10초마다 TEMP→CONFIRMED 승격 |
| `queueAuth.ts` | `queue.findUnique` | 요청마다 토큰 검증 |

---

## Redis Sorted Set 전환 계획

### Phase 0 — Redis 클라이언트 설정

**새 파일**: `backend/src/lib/redis.ts`
```typescript
import Redis from 'ioredis'
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
export { redis }
```

패키지 설치: `ioredis`
Docker Compose에 Redis 컨테이너 추가

---

### Phase 1 — 대기열 입장/순번을 Redis로 교체

**수정**: `queueService.ts`

현재 (DB):
```
queue.create → DB INSERT
queue.count(enteredAt < ...) → 순번
queue.count(TEMP) → 전체 대기 인원
```

변경 후 (Redis):
```
ZADD queue:waiting {timestamp} {userId}     → 입장
ZRANK queue:waiting {userId}                → 순번 (0-based)
ZCARD queue:waiting                         → 전체 대기 인원
```

**DB 역할 변경**: Queue 레코드는 여전히 DB에 생성 (토큰 저장, queueAuth 검증용). 순번 계산만 Redis로 이동.

---

### Phase 2 — 스케줄러를 Redis로 교체

**수정**: `scheduler.ts`

현재 (DB):
```
1. CONFIRMED 만료 → updateMany
2. CONFIRMED 수 카운트 → count
3. TEMP 선착순 조회 → findMany + orderBy
4. 일괄 승격 → updateMany
```

변경 후 (Redis + DB):
```
1. CONFIRMED 만료
   → ZRANGEBYSCORE queue:active 0 {만료기준시각}
   → ZREM queue:active {만료된유저들}
   → DB updateMany (status→EXPIRED) 동기화

2. 승격 대상 선정
   → slots = MAX_ACTIVE - ZCARD queue:active
   → ZRANGE queue:waiting 0 {slots-1}  ← 선착순
   → ZREM queue:waiting {승격유저들}
   → ZADD queue:active {now} {승격유저들}
   → DB updateMany (status→CONFIRMED) 동기화

3. 분산 락 추가
   → SET scheduler:lock 1 NX EX 15
   → 인스턴스 하나만 실행
```

---

### Phase 3 — getStatus 폴링 최적화

**수정**: `queueService.getStatus()`

현재: DB 쿼리 3회
변경 후: Redis 쿼리 2회 (ZRANK + ZCARD), DB 0회

```typescript
const position = await redis.zrank('queue:waiting', userId)
const totalWaiting = await redis.zcard('queue:waiting')
```

---

## 수정 대상 파일 요약

| 파일 | 변경 |
|---|---|
| `backend/src/lib/redis.ts` | 신규 — Redis 클라이언트 |
| `backend/src/services/queueService.ts` | 순번 조회 DB→Redis |
| `backend/src/lib/scheduler.ts` | 승격/만료 DB→Redis + 분산 락 |
| `backend/src/middleware/queueAuth.ts` | 변경 없음 (토큰 검증은 DB 유지) |
| `docker-compose.yml` | 신규 — Redis 컨테이너 |
| `package.json` | `ioredis` 추가 |

---

## DB와 Redis 역할 분리

```
Redis (빠름, 휘발성)          DB (느림, 영구)
├─ 대기 순번 (Sorted Set)     ├─ Queue 레코드 (토큰, 상태)
├─ 활성 유저 목록              ├─ 상태 이력
└─ 스케줄러 락                └─ queueAuth 토큰 검증
```

Redis가 죽어도 DB에 상태가 남아있어서 복구 가능. Redis는 **성능 최적화 레이어**이고, DB가 **원본 데이터**.
