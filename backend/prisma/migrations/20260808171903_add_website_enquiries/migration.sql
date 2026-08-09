-- CreateEnum
CREATE TYPE "WebsiteEnquiryType" AS ENUM ('STUDENT', 'FRANCHISE');

-- CreateTable
CREATE TABLE "website_enquiries" (
    "id" TEXT NOT NULL,
    "type" "WebsiteEnquiryType" NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "course" TEXT,
    "city" TEXT,
    "message" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "website_enquiries_type_idx" ON "website_enquiries"("type");

-- CreateIndex
CREATE INDEX "website_enquiries_createdAt_idx" ON "website_enquiries"("createdAt");
