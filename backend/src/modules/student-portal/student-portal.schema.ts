import { z } from 'zod';

export const examParamsSchema = z.object({
  examId: z.string().uuid().or(z.string()),
  courseId: z.string().uuid().or(z.string()).optional(),
});

const answersSchema = z.record(z.string(), z.number()).refine((obj) => Object.keys(obj).length >= 1, {
  message: 'At least one answer is required',
});

export const submitExamSchema = z.object({
  answers: answersSchema,
});

export type ExamParams = z.infer<typeof examParamsSchema>;
export type SubmitExamBody = z.infer<typeof submitExamSchema>;
