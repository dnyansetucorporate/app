-- AlterTable
ALTER TABLE "student_credentials" ADD COLUMN     "notifiedAt" TIMESTAMP(3),
ADD COLUMN     "passwordViewedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "studentCredentialId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "userRole" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_studentId_idx" ON "audit_logs"("studentId");

-- CreateIndex
CREATE INDEX "audit_logs_examDate_idx" ON "audit_logs"("examDate");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_studentCredentialId_fkey" FOREIGN KEY ("studentCredentialId") REFERENCES "student_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
