# 콘서트 예약 시스템

## ERD

![ERD](erd.png)

## DB 설계

### User
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK | 내부 식별자 |
| user_id | VARCHAR | UNIQUE | 외부 식별자 |
| name | VARCHAR | | 사용자 이름 |
| created_at | TIMESTAMP | | 가입일 |

### Concert
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK | 내부 식별자 |
| concert_id | VARCHAR | UNIQUE | 외부 식별자 |
| concert_name | VARCHAR | | 콘서트명 |

### ConcertSchedule
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK | 내부 식별자 |
| concert_id | BIGINT | FK → Concert.id, NOT NULL | 어떤 콘서트의 회차인지 |
| start_at | TIMESTAMP | NOT NULL | 공연 시작일시 |
| end_at | TIMESTAMP | NOT NULL | 공연 종료일시 |
| venue | VARCHAR | | 공연 장소 |

### Seat
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK | 내부 식별자 |
| schedule_id | BIGINT | FK → ConcertSchedule.id | 해당 공연 회차 |
| seat_no | VARCHAR | | 좌석 번호 (예: A-01) |

### Queue (대기열)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK | 내부 식별자 |
| user_id | BIGINT | FK → User.id, NOT NULL | 대기 사용자 |
| schedule_id | BIGINT | FK → ConcertSchedule.id, NOT NULL | 대기 중인 공연 회차 |
| entered_at | TIMESTAMP | NOT NULL | 대기열 진입 시각 |
| token | VARCHAR | UNIQUE | 인증 토큰 |
| status | VARCHAR | | `TEMP` / `CONFIRMED` / `CANCELED` / `EXPIRED` |

### Reservation (예약)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK | 내부 식별자 |
| user_id | BIGINT | FK → User.id, NOT NULL | 예약 사용자 |
| seat_id | BIGINT | FK → Seat.id, NOT NULL | 예약 좌석 |
| status | VARCHAR | NOT NULL | `HELD` / `CONFIRMED` / `EXPIRED` |
| held_at | TIMESTAMP | | 임시 배정 시각 |
| expired_at | TIMESTAMP | | 만료 예정 시각 |
| confirmed_at | TIMESTAMP | | 예약 확정 시각 |
| queue_id | BIGINT | FK → Queue.id | 연결된 대기열 |

### Payment (결제)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK | 내부 식별자 |
| reservation_id | BIGINT | FK → Reservation.id, NOT NULL | 연결된 예약 |
| amount | BIGINT | NOT NULL | 결제 금액 |
| status | VARCHAR | | `PENDING` / `SUCCESS` / `FAILED` / `REFUNDED` |
| paid_at | TIMESTAMP | | 결제 완료 시각 |

### UserBalance (잔액)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK | 내부 식별자 |
| user_id | BIGINT | FK → User.id, UNIQUE, NOT NULL | 사용자 |
| balance | BIGINT | NOT NULL, DEFAULT 0 | 현재 잔액 |

### BalanceHistory (잔액 이력)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK | 내부 식별자 |
| user_id | BIGINT | FK → User.id, NOT NULL | 사용자 |
| amount | BIGINT | NOT NULL | 충전/차감 금액 |
| type | VARCHAR | | `CHARGE` / `USE` / `REFUND` |
| created_at | TIMESTAMP | NOT NULL | 생성일 |
