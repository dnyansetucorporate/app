import { z } from 'zod';

const indianPhoneRegex = /^[6-9]\d{9}$/;

const baseFields = {
  fullName: z.string().trim().min(1, 'Full name is required'),
  phone: z.string().trim().regex(indianPhoneRegex, 'Enter a valid 10-digit mobile number'),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('').transform(() => undefined)),
  message: z.string().trim().optional().or(z.literal('').transform(() => undefined)),
};

export const createStudentEnquirySchema = z.object({
  ...baseFields,
  course: z.string().trim().min(1, 'Please select a course'),
});

export const createFranchiseEnquirySchema = z.object({
  ...baseFields,
  city: z.string().trim().min(1, 'City is required'),
});

export type CreateStudentEnquiryDto = z.infer<typeof createStudentEnquirySchema>;
export type CreateFranchiseEnquiryDto = z.infer<typeof createFranchiseEnquirySchema>;
