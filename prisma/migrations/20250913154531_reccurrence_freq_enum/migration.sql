/*
  Warnings:

  - You are about to drop the column `recurrence` on the `Transaction` table. All the data in the column will be lost.
  - Changed the type of `recurrenceFrequency` on the `RecurringTransaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "public"."RecurringTransaction" DROP COLUMN "recurrenceFrequency",
ADD COLUMN     "recurrenceFrequency" "public"."RecurrenceFrequency" NOT NULL;

-- AlterTable
ALTER TABLE "public"."Transaction" DROP COLUMN "recurrence";
