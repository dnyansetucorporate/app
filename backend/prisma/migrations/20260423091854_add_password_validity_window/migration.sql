/*
  Warnings:

  - Added the required column `validFrom` to the `student_credentials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `validUntil` to the `student_credentials` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "student_credentials" ADD COLUMN     "validFrom" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "validUntil" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "student_credentials_examDate_idx" ON "student_credentials"("examDate");

-- CreateIndex
CREATE INDEX "student_credentials_validFrom_idx" ON "student_credentials"("validFrom");

-- CreateIndex
CREATE INDEX "student_credentials_validUntil_idx" ON "student_credentials"("validUntil");
