/*
  Warnings:

  - You are about to drop the column `price` on the `Gig` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `GigPackage` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Gig` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[gigId,tier]` on the table `GigPackage` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Gig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceCents` to the `GigPackage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tier` to the `GigPackage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `GigPackage` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GigStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GigPackageTier" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM');

-- DropIndex
DROP INDEX "Gig_isActive_idx";

-- DropIndex
DROP INDEX "Gig_price_idx";

-- AlterTable
ALTER TABLE "Gig" DROP COLUMN "price",
ADD COLUMN     "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "imagesPublicIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ordersCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "reviewsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shortDescription" VARCHAR(280),
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "status" "GigStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "videoUrl" TEXT,
ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "images" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "isActive" SET DEFAULT false;

-- AlterTable
ALTER TABLE "GigPackage" DROP COLUMN "price",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "priceCents" INTEGER NOT NULL,
ADD COLUMN     "tier" "GigPackageTier" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "name" SET DEFAULT '',
ALTER COLUMN "features" SET DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Gig_slug_key" ON "Gig"("slug");

-- CreateIndex
CREATE INDEX "Gig_status_idx" ON "Gig"("status");

-- CreateIndex
CREATE INDEX "Gig_slug_idx" ON "Gig"("slug");

-- CreateIndex
CREATE INDEX "Gig_avgRating_idx" ON "Gig"("avgRating");

-- CreateIndex
CREATE INDEX "Gig_ordersCount_idx" ON "Gig"("ordersCount");

-- CreateIndex
CREATE UNIQUE INDEX "GigPackage_gigId_tier_key" ON "GigPackage"("gigId", "tier");
