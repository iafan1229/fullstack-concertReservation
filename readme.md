# 콘서트 예약 시스템

## ERD

![ERD](erd.png)

## DB 설계

```dbml
Table User {
  id BIGINT [primary key]
  user_id varchar [unique]
  name varchar
  created_at timestamp
}

Table Concert {
  id BIGINT [primary key]
  concert_id varchar [unique]
  concert_name varchar
}

Table ConcertSchedule {
  id BIGINT [primary key]
  concert_id BIGINT [not null] //어떤 콘서트의 회차인지
  start_at timestamp [not null]
  end_at timestamp [not null]
  venue varchar
}

Table Seat {
  id BIGINT [primary key]
  schedule_id BIGINT
  seat_no varchar
}

Table Reservation {
  id BIGINT [primary key]
  user_id BIGINT [not null]
  seat_id BIGINT [not null]
  status varchar [not null]

  held_at timestamp
  expired_at timestamp
  confirmed_at timestamp

  queue_id BIGINT
}

Table Queue {
  id BIGINT [primary key]
  user_id BIGINT [not null]
  schedule_id BIGINT [not null]
  entered_at timestamp [not null]
  token varchar [unique]
  status varchar // TEMP, CONFIRMED, CANCELED, EXPIRED
}

Table Payment {
  id BIGINT [primary key]
  reservation_id BIGINT [not null]
  amount BIGINT [not null]
  status varchar // PENDING, SUCCESS, FAILED, REFUNDED
  paid_at timestamp
}

Table UserBalance {
  id BIGINT [primary key]
  user_id BIGINT [unique, not null]
  balance BIGINT [not null, default: 0]
}

Table BalanceHistory {
  id BIGINT [primary key]
  user_id BIGINT [not null]
  amount BIGINT [not null] //충전,차감 금액
  type varchar //CHARGE, USE, REFUND
  created_at timestamp [not null]
}

Ref: Seat.schedule_id > ConcertSchedule.id
Ref: Reservation.user_id > User.id
Ref: Reservation.seat_id > Seat.id
Ref: Queue.user_id > User.id
Ref: Queue.schedule_id > ConcertSchedule.id
Ref: ConcertSchedule.concert_id > Concert.id
Ref: Reservation.queue_id > Queue.id
Ref: Payment.reservation_id > Reservation.id
Ref: UserBalance.user_id > User.id
Ref: BalanceHistory.user_id > User.id
```
