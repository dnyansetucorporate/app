-- AlterTable: Branch ATP (Authorised Training Provider) registration number
ALTER TABLE "branches" ADD COLUMN "atpNo" TEXT;

-- AlterTable: Student certificate number
ALTER TABLE "certificates" ADD COLUMN "certNo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "branches_atpNo_key" ON "branches"("atpNo");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certNo_key" ON "certificates"("certNo");
