-- ============================================================================
-- ReservaLab — Script DDL de Criação do Banco de Dados (PostgreSQL)
-- Alinhado ao schema Prisma (server/prisma/schema.prisma)
-- ============================================================================

-- 1. Tipos Enumerados (Enums)
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

CREATE TYPE "ReservationStatus" AS ENUM (
    'SCHEDULED',
    'ACTIVE_LOAN',
    'COMPLETED',
    'NO_SHOW',
    'CANCELLED'
);

-- 2. Tabelas Principais
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "is_manually_blocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "patrimony_code" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Item_quantity_check" CHECK ("quantity" >= 1)
);

CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "expected_pickup_at" TIMESTAMP(3) NOT NULL,
    "expected_return_at" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "approval_status" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "request_reason" TEXT,
    "admin_decision_reason" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "actual_pickup_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actual_return_at" TIMESTAMP(3),
    "return_observation" TEXT,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "description" TEXT NOT NULL,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "max_rent_days" INTEGER NOT NULL DEFAULT 14,
    "max_concurrent_items" INTEGER NOT NULL DEFAULT 3,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- 3. Índices de Unicidade (Constraints UNIQUE)
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Item_patrimony_code_key" ON "Item"("patrimony_code");
CREATE UNIQUE INDEX "Loan_reservation_id_key" ON "Loan"("reservation_id");

-- 4. Índices de Apoio para Chaves Estrangeiras e Consultas Frequentes
CREATE INDEX "Item_category_id_idx" ON "Item"("category_id");
CREATE INDEX "Reservation_user_id_status_idx" ON "Reservation"("user_id", "status");
CREATE INDEX "Reservation_item_id_status_idx" ON "Reservation"("item_id", "status");
CREATE INDEX "MaintenanceRecord_item_id_idx" ON "MaintenanceRecord"("item_id");

-- 5. Chaves Estrangeiras (Relacionamentos e Integridade Referencial)
ALTER TABLE "Item"
    ADD CONSTRAINT "Item_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "Category"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Reservation"
    ADD CONSTRAINT "Reservation_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Reservation"
    ADD CONSTRAINT "Reservation_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "Item"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Loan"
    ADD CONSTRAINT "Loan_reservation_id_fkey"
    FOREIGN KEY ("reservation_id") REFERENCES "Reservation"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MaintenanceRecord"
    ADD CONSTRAINT "MaintenanceRecord_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "Item"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
