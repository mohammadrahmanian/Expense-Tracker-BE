/*
  Warnings:

  - A unique constraint covering the columns `[id,userId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Category_id_userId_key" ON "public"."Category"("id", "userId");
