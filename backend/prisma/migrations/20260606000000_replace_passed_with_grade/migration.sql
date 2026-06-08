-- Add grade column derived from existing marks
ALTER TABLE "exam_results" ADD COLUMN "grade" TEXT NOT NULL DEFAULT 'C';

-- Populate grade from marks for existing records
UPDATE "exam_results" SET "grade" = CASE
  WHEN marks >= 75 THEN 'A'
  WHEN marks >= 50 THEN 'B'
  ELSE 'C'
END;

-- Remove the temporary default
ALTER TABLE "exam_results" ALTER COLUMN "grade" DROP DEFAULT;

-- Drop the old passed column
ALTER TABLE "exam_results" DROP COLUMN "passed";
