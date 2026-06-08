import { z } from 'zod';

export const statsQuerySchema = z.object({
  branchId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const performanceQuerySchema = z.object({
  branchId: z.string().optional(),
  year: z.string().optional(),
});

export const enrollmentQuerySchema = z.object({
  branchId: z.string().optional(),
});

export const recentStudentsQuerySchema = z.object({
  branchId: z.string().optional(),
});

export type StatsQuery = z.infer<typeof statsQuerySchema>;
export type PerformanceQuery = z.infer<typeof performanceQuerySchema>;
export type EnrollmentQuery = z.infer<typeof enrollmentQuerySchema>;
export type RecentStudentsQuery = z.infer<typeof recentStudentsQuerySchema>;
