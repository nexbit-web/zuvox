-- CreateTable
CREATE TABLE "PhoneReveal" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneReveal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhoneReveal_viewerId_createdAt_idx" ON "PhoneReveal"("viewerId", "createdAt");

-- CreateIndex
CREATE INDEX "PhoneReveal_viewerId_targetId_idx" ON "PhoneReveal"("viewerId", "targetId");

-- CreateIndex
CREATE INDEX "PhoneReveal_targetId_createdAt_idx" ON "PhoneReveal"("targetId", "createdAt");

-- AddForeignKey
ALTER TABLE "PhoneReveal" ADD CONSTRAINT "PhoneReveal_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneReveal" ADD CONSTRAINT "PhoneReveal_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
