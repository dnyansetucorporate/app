import { z } from 'zod';

// Validation helper for Indian phone numbers (10 digits, starting with 6-9)
const indianPhoneRegex = /^[6-9]\d{9}$/;


export const studentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  branchId: z.string().optional(),
  courseId: z.string().optional(),
  paymentStatus: z.enum(['FULL_PAID', 'PARTIAL_PAID', 'PENDING']).optional(),
});

export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
  middleName: z.string().optional().or(z.literal('').transform(() => undefined)),
  lastName: z.string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('').transform(() => undefined)),
  phone: z.string()
    .min(1, 'Phone number is required')
    .regex(indianPhoneRegex, 'Phone number must be a valid Indian mobile number (10 digits, starting with 6-9)'),
  address: z.string().optional().refine(val => !val || val.length >= 5, 'Address must be at least 5 characters'),
  dob: z.string().optional(),
  branchId: z.string().min(1, 'Branch is required'),
  photo: z.preprocess(
    (val) => (val && typeof val === 'string' ? val : undefined),
    z.string().optional()
  ),
});

export const updateStudentSchema = createStudentSchema.partial();

// Schema for student enrollments
export const enrollmentSchema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  courseFee: z.union([
    z.number().positive('Course fee must be greater than 0'),
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Course fee must be a valid decimal number').transform(Number),
  ]),
  paymentStatus: z.enum(['FULL_PAID', 'PARTIAL_PAID', 'PENDING']).default('PENDING'),
});

export type StudentQuery = z.infer<typeof studentQuerySchema>;
export type CreateStudentDto = z.infer<typeof createStudentSchema>;
export type EnrollmentDto = z.infer<typeof enrollmentSchema>;
