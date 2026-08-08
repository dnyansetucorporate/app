import { z } from 'zod';

const indianPhoneRegex = /^[6-9]\d{9}$/;

export const enquiryQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  branchId: z.string().optional(),
  admissionTaken: z.enum(['true', 'false']).optional(),
});

export const createEnquirySchema = z.object({
  name: z.string().min(1, 'Name is required').min(2, 'Name must be at least 2 characters'),
  contactNo: z.string()
    .min(1, 'Contact number is required')
    .regex(indianPhoneRegex, 'Contact number must be a valid Indian mobile number (10 digits, starting with 6-9)'),
  source: z.string().optional().or(z.literal('').transform(() => undefined)),
  courseEnrolledFor: z.string().optional().or(z.literal('').transform(() => undefined)),
  enquiryDate: z.string().min(1, 'Enquiry date is required'),
  address: z.string().optional().or(z.literal('').transform(() => undefined)),
  education: z.string().optional().or(z.literal('').transform(() => undefined)),
  dob: z.string().optional().or(z.literal('').transform(() => undefined)),
  feeStructure: z.string().optional().or(z.literal('').transform(() => undefined)),
  admissionTaken: z.boolean().default(false),
  admissionDate: z.string().optional().or(z.literal('').transform(() => undefined)),
  joiningDate: z.string().optional().or(z.literal('').transform(() => undefined)),
  courseTime: z.string().optional().or(z.literal('').transform(() => undefined)),
  remark: z.string().optional().or(z.literal('').transform(() => undefined)),
  branchId: z.string().optional(),
});

export const updateEnquirySchema = createEnquirySchema.partial().omit({ branchId: true });

export const createFollowUpSchema = z.object({
  date: z.string().min(1, 'Follow-up date is required'),
  note: z.string().min(1, 'Follow-up note is required'),
});

export type EnquiryQuery = z.infer<typeof enquiryQuerySchema>;
export type CreateEnquiryDto = z.infer<typeof createEnquirySchema>;
export type UpdateEnquiryDto = z.infer<typeof updateEnquirySchema>;
export type CreateFollowUpDto = z.infer<typeof createFollowUpSchema>;
