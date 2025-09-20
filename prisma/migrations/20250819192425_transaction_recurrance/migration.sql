/*
  Warnings:

  - You are about to drop the column `isRecurring` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `recurredAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurredAt" TIMESTAMP(3),
ADD COLUMN     "recurrence" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isRecurring",
DROP COLUMN "recurredAt";
