# 콘서트 예약 시스템 PRD (Product Requirements Document)

## 1. 프로젝트 개요

### 1.1 목적
대규모 트래픽이 몰리는 콘서트 티켓 예약 시스템을 구축한다. 사용자는 대기열(Queue)을 통해 순서대로 좌석을 예약하고, 잔액 충전 후 결제까지 완료할 수 있다.

### 1.2 핵심 문제
- 인기 콘서트 오픈 시 동시 접속자 폭증으로 인한 서버 부하
- 좌석 중복 예약 방지
- 공정한 선착순 처리

---

## 2. 전체 서비스 플로우

```
[회원가입 / 로그인]
       ↓
[잔액 충전] ← 결제 전 미리 충전해 두어야 함
       ↓
[대기열 토큰 발급] → TEMP 상태로 대기열 진입
       ↓ (스케줄러가 순서대로 활성화)
[CONFIRMED 상태] → 좌석 조회 가능
       ↓
[좌석 예약 요청] → 좌석 HELD (5분 임시 배정), 잔액 차감 없음
       ↓
[결제 API 호출] → 잔액 확인 후 차감, Reservation CONFIRMED, 대기열 토큰 만료
       ↓
      완료

※ HELD 상태에서 5분 내 결제 미완료 → EXPIRED (좌석 재개방)
※ 잔액 부족 시 결제 API에서 실패 → 좌석은 만료될 때까지 HELD 유지
```

---

## 3. 핵심 기능 (Features)

### 2.1 대기열 (Queue)
- 사용자가 예약 페이지 진입 시 대기열에 등록되며 고유 토큰이 발급된다.
- 대기열 상태: `TEMP` → `CONFIRMED` → `CANCELED` / `EXPIRED`
- `CONFIRMED` 상태의 사용자만 좌석 조회 및 예약이 가능하다.
- 토큰 만료 시간: CONFIRMED 진입 후 N분 (예: 5분) 내 미결제 시 만료

### 2.2 콘서트 & 좌석 조회
- 예약 가능한 콘서트 목록 조회
- 콘서트별 스케줄(일정) 조회
- 스케줄별 잔여 좌석 조회 (ACTIVE 대기열 토큰 필요)

### 2.3 좌석 예약 (임시 배정)
- 특정 좌석 선택 시 해당 좌석을 임시 배정(HOLD) 처리한다.
- 임시 배정 상태: `HELD` → `CONFIRMED` / `EXPIRED`
- HELD 상태에서 N분(예: 5분) 내 결제 미완료 시 자동 만료 → 좌석 재개방
- 한 사용자는 한 스케줄에 하나의 좌석만 예약 가능
- 예약 시점에 좌석 가격만큼 잔액을 즉시 차감하며, 만료 시 자동 환불 처리

**좌석 등급 및 가격 정책**

| 등급 | 좌석 번호 | 가격 |
|------|-----------|------|
| VIP | 1 ~ 10 | 150,000원 |
| R석 | 11 ~ 30 | 100,000원 |
| 일반 | 31 ~ 50 | 70,000원 |

### 2.4 잔액 충전 & 조회
- 사용자는 포인트(잔액)를 충전할 수 있다.
- 충전/사용 이력을 BalanceHistory로 관리한다.
- 잔액 충전 타입: `CHARGE` / 사용 타입: `USE` / 환불 타입: `REFUND`

### 2.5 결제
- 임시 배정된 좌석에 대해 잔액으로 결제한다.
- 결제 성공 시:
  - Reservation 상태 → `CONFIRMED`
  - UserBalance 차감
  - BalanceHistory 기록 (USE)
  - Payment 생성
- 결제 상태: `PENDING` → `SUCCESS` / `FAILED` / `REFUNDED`

---

## 4. 도메인 모델

### User (사용자)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | BIGINT PK | 내부 식별자 |
| user_id | VARCHAR | 외부 식별자 (UUID 등) |
| email | VARCHAR | 이메일 (UNIQUE) |
| password | VARCHAR | 비밀번호 |
| name | VARCHAR | 사용자 이름 |
| created_at | TIMESTAMP | 가입일 |

### UserBalance (잔액)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | BIGINT PK | 내부 식별자 |
| user_id | BIGINT FK | User 참조 |
| balance | BIGINT | 현재 잔액 (원 단위) |

### BalanceHistory (잔액 이력)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | BIGINT PK | 내부 식별자 |
| user_id | BIGINT FK | User 참조 |
| amount | BIGINT | 변동 금액 |
| type | VARCHAR | `CHARGE` / `USE` / `REFUND` |
| created_at | TIMESTAMP | 생성일 |

### Concert (콘서트)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | BIGINT PK | 내부 식별자 |
| concert_id | VARCHAR | 외부 식별자 |
| concert_name | VARCHAR | 콘서트명 |

### ConcertSchedule (공연 일정)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | BIGINT PK | 내부 식별자 |
| concert_id | BIGINT FK | Concert 참조 |
| start_at | TIMESTAMP | 공연 시작일시 |
| end_at | TIMESTAMP | 공연 종료일시 |
| venue | VARCHAR | 공연장소 |

### Seat (좌석)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | BIGINT PK | 내부 식별자 |
| schedule_id | BIGINT FK | ConcertSchedule 참조 |
| seat_no | VARCHAR | 좌석 번호 (1~50) |
| price | BIGINT | 좌석 가격 (VIP: 150,000 / R석: 100,000 / 일반: 70,000) |

### Queue (대기열)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | BIGINT PK | 내부 식별자 |
| user_id | BIGINT FK | User 참조 |
| entered_at | TIMESTAMP | 대기열 진입 시각 |
| confirmed_at | TIMESTAMP | 활성화 시각 |
| token | VARCHAR | 인증 토큰 (UUID, UNIQUE) |
| status | VARCHAR | `TEMP` / `CONFIRMED` / `CANCELED` / `EXPIRED` |

### Reservation (예약)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | BIGINT PK | 내부 식별자 |
| user_id | BIGINT FK | User 참조 |
| seat_id | BIGINT FK | Seat 참조 |
| status | VARCHAR | `HELD` / `CONFIRMED` / `EXPIRED` |
| held_at | TIMESTAMP | 임시 배정 시각 |
| expired_at | TIMESTAMP | 만료 예정 시각 |
| confirmed_at | TIMESTAMP | 예약 확정 시각 |
| queue_id | BIGINT FK | Queue 참조 |

### Payment (결제)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | BIGINT PK | 내부 식별자 |
| reservation_id | BIGINT FK | Reservation 참조 |
| amount | BIGINT | 결제 금액 |
| status | VARCHAR | `PENDING` / `SUCCESS` / `FAILED` / `REFUNDED` |
| paid_at | TIMESTAMP | 결제 완료 시각 |

---

## 5. API 설계 (개요)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | /users | 사용자 생성 | - |
| GET | /users/:userId/balance | 잔액 조회 | JWT |
| PATCH | /users/:userId/balance/charge | 잔액 충전 | JWT |
| POST | /queue | 대기열 토큰 발급 | JWT |
| GET | /queue/status | 대기열 상태 조회 | Queue Token |
| GET | /concerts | 콘서트 목록 조회 | Queue Token |
| GET | /concerts/:concertId/schedules | 스케줄 목록 조회 | Queue Token |
| GET | /concerts/:concertId/schedules/:scheduleId/seats | 잔여 좌석 조회 | Queue Token |
| POST | /reservations | 좌석 임시 배정 | Queue Token |
| POST | /payments | 결제 처리 | Queue Token |

---

## 6. 비기능 요구사항

### 5.1 동시성 제어
- 좌석 임시 배정 시 **낙관적 락(Optimistic Lock)** 또는 **비관적 락(Pessimistic Lock)** 사용
- 잔액 차감 시 동시성 이슈 방지 (트랜잭션 처리)

### 5.2 성능
- 대기열 처리: Redis 기반 순서 관리 (향후 확장 고려)
- 만료된 예약 자동 처리: 스케줄러(Cron) 주기적 실행

### 5.3 데이터 무결성
- 한 좌석에 동시에 하나의 HELD/CONFIRMED 예약만 존재 가능
- 결제와 잔액 차감은 하나의 트랜잭션으로 처리

---

## 7. 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | Next.js (TypeScript) |
| Backend | Express.js (TypeScript) |
| ORM | Prisma |
| DB | PostgreSQL |
| 인증 | JWT |

---

## 8. 개발 로드맵

| 단계 | 내용 | 비고 |
|------|------|------|
| 현재 | 프로토타입 완성 | PostgreSQL 기반 대기열, 폴링 방식 |
| 1단계 | 기능 완성 | 예약·결제 플로우 end-to-end 동작 확인 |
| 2단계 | Redis 교체 | 대기열 저장소를 Redis Sorted Set으로 전환, 순번 조회 최적화 |
| 3단계 | SSE 교체 | 클라이언트 폴링 → Server-Sent Events로 전환 |
| 4단계 | MAX_ACTIVE 동적 조정 | 서버 CPU 모니터링 기반 동적 조정 |

---

## 9. Redis 도입 계획

| 문제 | Redis 기능 |
|------|------|
| DB 폴링 | Pub/Sub — 변화를 푸시 |
| 레이스 컨디션 | 분산 락 (SET NX) — 동시 접근 차단 |
| 반복 DB 쿼리 | 캐시 (GET/SET TTL) — 결과 저장 |

---

## 10. 배포 기준 실행 계획

### Phase 1 — 환경 구성
- 로컬: Docker Compose로 Redis 추가
- 배포: AWS ElastiCache 또는 Upstash
- 패키지: `ioredis` 설치
- `backend/src/lib/redis.ts` 싱글턴 클라이언트 생성

### Phase 2 — 좌석 분산 락 (우선순위 최상)
- 예약 생성 전 `SET seat:{seatId}:lock {userId} NX EX 10` 으로 락 획득
- 락 획득 실패 시 "다른 사용자가 선택 중" 즉시 반환
- 예약 완료/실패 후 락 해제

### Phase 3 — 대기열 Redis화
- 대기 순번 → Redis Sorted Set (`ZADD`, `ZRANK`)
- 스케줄러 중복 실행 방지 → 분산 락으로 단일 인스턴스만 실행

### Phase 4 — 캐싱
- `GET /api/concerts`, `GET /api/concerts/:id/schedules` → Redis 캐시 (TTL 60s)
- 좌석 변경 시 캐시 무효화

### Phase 5 — 배포 인프라

```
[유저]
  ↓
[Route 53] ← 도메인 (example.com)
  ↓
[CloudFront] ← CDN, HTTPS
  ↓              ↓
[S3 or Vercel]  [ALB] ← 로드 밸런서
(Next.js)         ↓
              [ECS or EC2]  ← Express 컨테이너
               ↓       ↓
            [RDS]   [ElastiCache]
          (PostgreSQL)  (Redis)
```
