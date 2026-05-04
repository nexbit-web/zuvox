/*
  Warnings:

  - You are about to drop the column `count` on the `Category` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[categoryId,slug]` on the table `Subcategory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Subcategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Subcategory` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- DropIndex
DROP INDEX "Category_name_idx";

-- DropIndex
DROP INDEX "Category_name_key";

-- DropIndex
DROP INDEX "Subcategory_name_categoryId_key";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "count",
ADD COLUMN     "color" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "freelancersCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gigsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Subcategory" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "gigsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "jobsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "avgPriceCents" INTEGER,
    "subcategoryId" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "gigsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Service_status_sortOrder_idx" ON "Service"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "Service_subcategoryId_idx" ON "Service"("subcategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_subcategoryId_slug_key" ON "Service"("subcategoryId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_status_sortOrder_idx" ON "Category"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "Subcategory_status_sortOrder_idx" ON "Subcategory"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategory_categoryId_slug_key" ON "Subcategory"("categoryId", "slug");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
