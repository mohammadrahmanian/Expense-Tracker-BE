/*
  Warnings:

  - A unique constraint covering the columns `[id,userId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Transaction_id_userId_key" ON "public"."Transaction"("id", "userId");
