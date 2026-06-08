import { z } from 'zod';

export const createExamSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  examDate: z.string()
    .min(1, 'Exam date is required')
    .refine(
      (date) => {
        const examDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return examDate >= today;
      },
      'Exam date must be today or in the future'
    ),
  notes: z.string().optional(),
  numStudents: z.number().int().min(0).default(0),
  studentIds: z.array(z.string()).optional(),
  courses: z.array(z.object({
    courseId: z.string().min(1, 'Course ID is required'),
    questionPaperId: z.string().optional(),
  })).optional(),
});

export const updateExamSchema = z.object({
  examDate: z.string()
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        const examDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return examDate >= today;
      },
      'Exam date must be today or in the future'
    ),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export const assignPaperSchema = z.object({
  questionPaperId: z.string().min(1, 'Question paper is required'),
});

export const examQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  branchId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type CreateExamDto = z.infer<typeof createExamSchema>;
export type UpdateExamDto = z.infer<typeof updateExamSchema>;
export type ExamQuery = z.infer<typeof examQuerySchema>;
