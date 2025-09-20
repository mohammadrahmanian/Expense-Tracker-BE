-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurredAt" TIMESTAMP(3);
