# 콘서트 예약 시스템

## ERD

![ERD](erd.png)

총 8개 테이블로 구성된 콘서트 예약 플랫폼입니다.

### 사용자 도메인

| 테이블 | 역할 |
|--------|------|
| User | 핵심 사용자 정보 (userId, email, password, name) |
| UserBalance | User와 1:1 관계. 현재 잔액 보관 |
| BalanceHistory | 잔액 변동 이력 (CHARGE / USE / REFUND) |

### 콘서트 도메인

| 테이블 | 역할 |
|--------|------|
| Concert | 콘서트 기본 정보 (이름) |
| ConcertSchedule | 콘서트별 회차 정보 (start_at, end_at, venue). Concert와 1:N |
| Seat | 회차별 좌석 (seat_no). ConcertSchedule과 1:N. (scheduleId, seatNo) 복합 unique |

### 예약/결제 도메인

| 테이블 | 역할 |
|--------|------|
| Queue | 대기열. 상태: `TEMP` → `CONFIRMED` → `CANCELED`/`EXPIRED` |
| Reservation | 좌석 예약. 상태: `HELD` → `CONFIRMED` / `EXPIRED`. User, Seat, Queue를 참조 |
| Payment | Reservation과 1:1. 상태: `PENDING` → `SUCCESS` / `FAILED` / `REFUNDED` |

## 테이블 관계 흐름

```
User ─── UserBalance      (1:1)
     ─── BalanceHistory   (1:N)
     ─── Queue            (1:N)
     ─── Reservation      (1:N)

Concert ─── ConcertSchedule (1:N)
                └─── Seat   (1:N)
                       └─── Reservation (1:N)

Queue       ─── Reservation (1:N)
Reservation ─── Payment     (1:1)
```

### 예약 흐름

```
User
  └── Queue (대기열 진입)
        └── Reservation 생성 허가 (queue_id FK)
              └── Reservation
                    ├── user_id FK  → User
                    └── seat_id FK  → Seat
                                         └── ConcertSchedule
                                               └── Concert
```

## 핵심 설계 포인트

1. **대기열(Queue)** 이 예약과 연결되어, 토큰 기반으로 예약 권한을 제어한다.
2. **잔액은 UserBalance에 현재값**, BalanceHistory에 변동 이력을 분리 저장 — 정합성과 추적성 모두 확보.
3. **좌석(Seat)** 은 콘서트가 아닌 **회차(ConcertSchedule)** 에 귀속 — 회차별로 독립적인 좌석 관리가 가능하다.
4. **Reservation의 `HELD` 상태** 는 임시 점유를 나타내며, 결제 전 만료(EXPIRED) 처리가 스케줄러에서 이루어진다.
