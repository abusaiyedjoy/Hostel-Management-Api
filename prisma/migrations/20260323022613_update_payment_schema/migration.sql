/*
  Warnings:

  - You are about to drop the column `bkashToken` on the `payments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSessionId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripePaymentIntentId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sslTranId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `invoiceNumber` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentProvider" ADD VALUE 'STRIPE';
ALTER TYPE "PaymentProvider" ADD VALUE 'SSLCOMMERZ';

-- DropIndex
DROP INDEX "payments_bkashPaymentId_idx";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "bkashToken",
ADD COLUMN     "invoiceNumber" TEXT NOT NULL,
ADD COLUMN     "sslTranId" TEXT,
ADD COLUMN     "sslValId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "stripeSessionId" TEXT,
ALTER COLUMN "provider" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_invoiceNumber_key" ON "payments"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeSessionId_key" ON "payments"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentIntentId_key" ON "payments"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_sslTranId_key" ON "payments"("sslTranId");

-- CreateIndex
CREATE INDEX "payments_provider_idx" ON "payments"("provider");

-- CreateIndex
CREATE INDEX "payments_invoiceNumber_idx" ON "payments"("invoiceNumber");
