/*
  Warnings:

  - You are about to drop the column `amount` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `branchId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `studentId` on the `payments` table. All the data in the column will be lost.
  - Added the required column `courseFee` to the `enrollments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `courseFee` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `enrollmentId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `feeTaken` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_branchId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_studentId_fkey";

-- DropIndex
DROP INDEX "payments_branchId_idx";

-- DropIndex
DROP INDEX "payments_status_idx";

-- DropIndex
DROP INDEX "payments_studentId_idx";

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "courseFee" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "amount",
DROP COLUMN "branchId",
DROP COLUMN "status",
DROP COLUMN "studentId",
ADD COLUMN     "courseFee" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "enrollmentId" TEXT NOT NULL,
ADD COLUMN     "feeTaken" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "payments_enrollmentId_idx" ON "payments"("enrollmentId");

-- CreateIndex
CREATE INDEX "payments_paymentStatus_idx" ON "payments"("paymentStatus");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
