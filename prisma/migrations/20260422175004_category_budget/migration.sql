-- CreateEnum
CREATE TYPE "public"."BudgetPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "public"."Category" ADD COLUMN     "budgetAmount" DECIMAL(10,2),
ADD COLUMN     "budgetPeriod" "public"."BudgetPeriod";
