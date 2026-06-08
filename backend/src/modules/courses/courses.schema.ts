import { z } from 'zod';

export const createCourseSchema = z.object({
  name: z.string().min(1, 'Course name is required'),
  description: z.string().optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

export const createQuestionPaperSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

export const addQuestionSchema = z.object({
  questionNo: z.number().int().min(1),
  questionText: z.string().min(1, 'Question text is required'),
  options: z.array(z.string().min(1)).min(2, 'At least 2 options required'),
  correctOption: z.number().int().min(0),
});

export const courseQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
});

export type CreateCourseDto = z.infer<typeof createCourseSchema>;
export type CreateQuestionPaperDto = z.infer<typeof createQuestionPaperSchema>;
export type AddQuestionDto = z.infer<typeof addQuestionSchema>;
