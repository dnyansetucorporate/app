import { z } from 'zod';

export const certQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  tab: z.enum(['branch', 'student']).default('branch'),
  branchId: z.string().optional(),
  search: z.string().optional(),
});

export const verifyCertQuerySchema = z
  .object({
    certNo: z.string().trim().min(1).optional(),
    prn: z.string().trim().min(1).optional(),
  })
  .refine((d) => Boolean(d.certNo || d.prn), { message: 'certNo or prn is required' });

export type CertQuery = z.infer<typeof certQuerySchema>;
export type VerifyCertQuery = z.infer<typeof verifyCertQuerySchema>;
