-- AlterTable
ALTER TABLE "FreelancerProfile" ADD COLUMN     "subcategory" TEXT;

-- CreateIndex
CREATE INDEX "FreelancerProfile_subcategory_idx" ON "FreelancerProfile"("subcategory");
