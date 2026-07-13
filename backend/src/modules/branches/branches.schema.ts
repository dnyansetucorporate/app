import { z } from 'zod';

// Validation helpers
const indianPhoneRegex = /^[6-9]\d{9}$/;
const aadharRegex = /^\d{12}$/; // 12 digits
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/; // Standard PAN format

// Password complexity: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const createBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required').min(3, 'Branch name must be at least 3 characters'),
  address: z.string().min(1, 'Address is required').min(5, 'Address must be at least 5 characters'),
  location: z.string().min(1, 'Location is required').min(2, 'Location must be at least 2 characters'),
  phone1: z.string()
    .min(1, 'Phone number is required')
    .regex(indianPhoneRegex, 'Phone number must be a valid Indian mobile number (10 digits, starting with 6-9)'),
  phone2: z.string()
    .regex(indianPhoneRegex, 'Phone number must be a valid Indian mobile number (10 digits, starting with 6-9)')
    .optional()
    .or(z.literal('')),
  aadharNo: z.string()
    .regex(aadharRegex, 'Aadhar number must be 12 digits')
    .optional()
    .or(z.literal('')),
  aadharImage: z.string().optional(),
  panNo: z.string()
    .regex(panRegex, 'PAN must be in format: AAAAA0000A')
    .optional()
    .or(z.literal('')),
  panImage: z.string().optional(),
  // Admin details
  adminName: z.string().min(1, 'Admin name is required').min(2, 'Admin name must be at least 2 characters'),
  adminEmail: z.string().email('Invalid admin email'),
  adminPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)'),
  adminDob: z.string().optional(),
  logo: z.string().optional(),
  validUpto: z.string().optional().or(z.literal('')),
});

export const updateBranchSchema = createBranchSchema.partial().omit({
  adminPassword: true,
  adminEmail: true,
});

export const branchQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  location: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type CreateBranchDto = z.infer<typeof createBranchSchema>;
export type UpdateBranchDto = z.infer<typeof updateBranchSchema>;
export type BranchQuery = z.infer<typeof branchQuerySchema>;
