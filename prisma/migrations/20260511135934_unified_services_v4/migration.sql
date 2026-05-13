-- CreateEnum
CREATE TYPE "ServiceFormat" AS ENUM ('ONLINE', 'OFFLINE', 'VISIT', 'HYBRID');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('FIXED', 'FROM', 'HOURLY', 'NEGOTIABLE');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('ASAP', 'TODAY', 'THIS_WEEK', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "CategoryDomain" AS ENUM ('ONLINE_ONLY', 'OFFLINE_ONLY', 'BOTH');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "domain" "CategoryDomain" NOT NULL DEFAULT 'BOTH';

-- AlterTable
ALTER TABLE "City" ADD COLUMN     "freelancersCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "FreelancerProfile" ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "primaryCity" TEXT,
ADD COLUMN     "serviceCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "travelFeeCents" INTEGER,
ADD COLUMN     "travelRadiusKm" INTEGER,
ADD COLUMN     "unavailableUntil" TIMESTAMP(3),
ADD COLUMN     "willTravel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "workingHours" JSONB,
ADD COLUMN     "worksOffline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "worksOnSite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "worksOnline" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Gig" ADD COLUMN     "city" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'UAH',
ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "format" "ServiceFormat" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "priceCents" INTEGER,
ADD COLUMN     "priceType" "PriceType" NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "serviceCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "travelFeeCents" INTEGER;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "address" TEXT,
ADD COLUMN     "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "attachmentsPublicIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "format" "ServiceFormat",
ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ADD COLUMN     "urgency" "Urgency" NOT NULL DEFAULT 'FLEXIBLE';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "format" "ServiceFormat",
ADD COLUMN     "scheduledFor" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "typicalFormat" "ServiceFormat";

-- AlterTable
ALTER TABLE "Subcategory" ADD COLUMN     "domain" "CategoryDomain";

-- CreateIndex
CREATE INDEX "Category_domain_idx" ON "Category"("domain");

-- CreateIndex
CREATE INDEX "City_status_sortOrder_idx" ON "City"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "FreelancerProfile_primaryCity_idx" ON "FreelancerProfile"("primaryCity");

-- CreateIndex
CREATE INDEX "FreelancerProfile_isAvailable_idx" ON "FreelancerProfile"("isAvailable");

-- CreateIndex
CREATE INDEX "Gig_format_idx" ON "Gig"("format");

-- CreateIndex
CREATE INDEX "Gig_city_idx" ON "Gig"("city");

-- CreateIndex
CREATE INDEX "Gig_format_city_status_idx" ON "Gig"("format", "city", "status");

-- CreateIndex
CREATE INDEX "Job_format_idx" ON "Job"("format");

-- CreateIndex
CREATE INDEX "Job_city_idx" ON "Job"("city");

-- CreateIndex
CREATE INDEX "Job_format_city_status_idx" ON "Job"("format", "city", "status");

-- CreateIndex
CREATE INDEX "Job_urgency_status_idx" ON "Job"("urgency", "status");

-- CreateIndex
CREATE INDEX "Order_scheduledFor_idx" ON "Order"("scheduledFor");

-- CreateIndex
CREATE INDEX "Subcategory_domain_idx" ON "Subcategory"("domain");
