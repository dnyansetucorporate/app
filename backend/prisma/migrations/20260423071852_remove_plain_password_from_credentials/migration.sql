/*
  Warnings:

  - You are about to drop the column `plainPassword` on the `student_credentials` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `student_credentials` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "student_credentials" DROP COLUMN "plainPassword",
ADD COLUMN     "displayedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
