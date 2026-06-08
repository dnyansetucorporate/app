import { z } from 'zod';

export const createEnrollmentSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  courseId: z.string().min(1, 'Course ID is required'),
  branchId: z.string().min(1, 'Branch ID is required'),
  courseFee: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Course fee must be a valid decimal number').transform(Number),
  // Payment status on enrollment creation must be PENDING — actual status is derived from Payment records
  paymentStatus: z.literal('PENDING').default('PENDING'),
});

export const updateEnrollmentSchema = z.object({
  paymentStatus: z.enum(['FULL_PAID', 'PARTIAL_PAID', 'PENDING']).optional(),
});

export const enrollmentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  studentId: z.string().optional(),
  courseId: z.string().optional(),
  branchId: z.string().optional(),
  paymentStatus: z.enum(['FULL_PAID', 'PARTIAL_PAID', 'PENDING']).optional(),
});

export type CreateEnrollmentDto = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentDto = z.infer<typeof updateEnrollmentSchema>;
export type EnrollmentQuery = z.infer<typeof enrollmentQuerySchema>;

