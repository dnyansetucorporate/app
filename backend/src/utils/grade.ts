// Canonical grading formula — the single source of truth for converting raw
// marks into a letter grade. Used both when a submitted exam result is first
// persisted (ExamResult.grade) and anywhere else marks need to be shown as a
// grade (e.g. public certificate verification), so the two never drift apart.
export const computeGrade = (marks: number): 'A' | 'B' | 'C' => {
  if (marks >= 75) return 'A';
  if (marks >= 50) return 'B';
  return 'C';
};
