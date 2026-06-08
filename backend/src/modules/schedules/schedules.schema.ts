import { z } from 'zod';

// Validate time format HH:MM
const timeFormatRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;

// Days of the week
const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export const createScheduleSchema = z.object({
  branchId: z.string().min(1, 'Branch ID is required'),
  courseId: z.string().min(1, 'Course ID is required'),
  dayOfWeek: z.enum(daysOfWeek as [string, ...string[]], { errorMap: () => ({ message: 'Invalid day of week' }) }),
  startTime: z.string()
    .regex(timeFormatRegex, 'Start time must be in HH:MM format (24-hour)')
    .min(1, 'Start time is required'),
  endTime: z.string()
    .regex(timeFormatRegex, 'End time must be in HH:MM format (24-hour)')
    .min(1, 'End time is required'),
  location: z.string().optional(),
}).refine(
  (data) => data.endTime > data.startTime,
  { message: 'End time must be after start time', path: ['endTime'] }
);

export const updateScheduleSchema = z.object({
  dayOfWeek: z.enum(daysOfWeek as [string, ...string[]]).optional(),
  startTime: z.string().regex(timeFormatRegex, 'Start time must be in HH:MM format (24-hour)').optional(),
  endTime: z.string().regex(timeFormatRegex, 'End time must be in HH:MM format (24-hour)').optional(),
  location: z.string().optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => !data.startTime || !data.endTime || data.endTime > data.startTime,
  { message: 'End time must be after start time', path: ['endTime'] }
);

export const scheduleQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  branchId: z.string().optional(),
  courseId: z.string().optional(),
  dayOfWeek: z.enum(daysOfWeek as [string, ...string[]]).optional(),
});

export type CreateScheduleDto = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleDto = z.infer<typeof updateScheduleSchema>;
export type ScheduleQuery = z.infer<typeof scheduleQuerySchema>;
