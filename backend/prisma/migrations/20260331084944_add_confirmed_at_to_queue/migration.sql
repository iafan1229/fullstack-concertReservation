-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_balances" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "balance" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "user_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_histories" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "amount" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concerts" (
    "id" BIGSERIAL NOT NULL,
    "concert_id" TEXT NOT NULL,
    "concert_name" TEXT NOT NULL,

    CONSTRAINT "concerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concert_schedules" (
    "id" BIGSERIAL NOT NULL,
    "concert_id" BIGINT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,

    CONSTRAINT "concert_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seats" (
    "id" BIGSERIAL NOT NULL,
    "schedule_id" BIGINT NOT NULL,
    "seat_no" TEXT NOT NULL,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queues" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "token" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TEMP',

    CONSTRAINT "queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "seat_id" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "held_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "queue_id" BIGINT,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" BIGSERIAL NOT NULL,
    "reservation_id" BIGINT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_user_id_key" ON "users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_balances_user_id_key" ON "user_balances"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "concerts_concert_id_key" ON "concerts"("concert_id");

-- CreateIndex
CREATE UNIQUE INDEX "seats_schedule_id_seat_no_key" ON "seats"("schedule_id", "seat_no");

-- CreateIndex
CREATE UNIQUE INDEX "queues_token_key" ON "queues"("token");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reservation_id_key" ON "payments"("reservation_id");

-- AddForeignKey
ALTER TABLE "user_balances" ADD CONSTRAINT "user_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_histories" ADD CONSTRAINT "balance_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concert_schedules" ADD CONSTRAINT "concert_schedules_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "concert_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
