/*
  Warnings:

  - A unique constraint covering the columns `[orderId,direction]` on the table `Review` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `direction` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReviewDirection" AS ENUM ('CLIENT_TO_FREELANCER', 'FREELANCER_TO_CLIENT');

-- DropIndex
DROP INDEX "Review_orderId_key";

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "direction" "ReviewDirection" NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "clientAvgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "clientReviewsCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Review_direction_idx" ON "Review"("direction");

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderId_direction_key" ON "Review"("orderId", "direction");
