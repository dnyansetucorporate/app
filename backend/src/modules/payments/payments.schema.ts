import { z } from 'zod';

export const createPaymentSchema = z.object({
  enrollmentId: z.string().min(1, 'Enrollment ID is required'),
  feeTaken: z.union([
    z.number().positive('Fee taken must be greater than 0'),
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Fee taken must be a valid decimal number').transform(Number),
  ]),
  nextInstallmentDate: z.string().optional().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    'Next installment date must be a valid date'
  ),
});

export const updatePaymentSchema = z.object({
  feeTaken: z.union([
    z.number().positive('Fee taken must be greater than 0'),
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Fee taken must be a valid decimal number').transform(Number),
  ]).optional(),
  paymentStatus: z.enum(['FULL_PAID', 'PARTIAL_PAID', 'PENDING']).optional(),
  nextInstallmentDate: z.string().nullable().optional().refine(
    (val) => val == null || val === '' || !isNaN(Date.parse(val)),
    'Next installment date must be a valid date'
  ),
});

export const paymentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  enrollmentId: z.string().optional(),
  studentId: z.string().optional(),
  courseId: z.string().optional(),
  paymentStatus: z.enum(['FULL_PAID', 'PARTIAL_PAID', 'PENDING']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentDto = z.infer<typeof updatePaymentSchema>;
export type PaymentQuery = z.infer<typeof paymentQuerySchema>;
