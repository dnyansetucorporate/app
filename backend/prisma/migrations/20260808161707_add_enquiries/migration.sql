-- CreateTable
CREATE TABLE "enquiries" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "source" TEXT,
    "courseEnrolledFor" TEXT,
    "enquiryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "address" TEXT,
    "education" TEXT,
    "dob" TIMESTAMP(3),
    "feeStructure" TEXT,
    "admissionTaken" BOOLEAN NOT NULL DEFAULT false,
    "admissionDate" TIMESTAMP(3),
    "joiningDate" TIMESTAMP(3),
    "courseTime" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry_follow_ups" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiry_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "enquiries_branchId_idx" ON "enquiries"("branchId");

-- CreateIndex
CREATE INDEX "enquiries_enquiryDate_idx" ON "enquiries"("enquiryDate");

-- CreateIndex
CREATE INDEX "enquiry_follow_ups_enquiryId_idx" ON "enquiry_follow_ups"("enquiryId");

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_follow_ups" ADD CONSTRAINT "enquiry_follow_ups_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
