import { Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  listSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getBranchCourseSchedules,
  getBranchSchedules,
} from './schedules.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

// GET /api/schedules
export const list = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const scopedBranch = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : undefined;
  const { schedules, meta } = await listSchedules(req.query as Record<string, unknown>, scopedBranch);
  sendSuccess(res, schedules, 'Schedules fetched', 200, meta);
});

// GET /api/schedules/:id
export const get = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const schedule = await getScheduleById(req.params.id as string);
  sendSuccess(res, schedule);
});

// POST /api/schedules
export const create = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  // Ensure branchId is set for BRANCH_ADMIN
  if (req.user?.role === 'BRANCH_ADMIN' && !req.body.branchId) {
    req.body.branchId = req.user.branchId;
  }

  const schedule = await createSchedule(req.body);
  sendSuccess(res, schedule, 'Schedule created', 201);
});

// PATCH /api/schedules/:id
export const update = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const schedule = await updateSchedule(req.params.id as string, req.body);
  sendSuccess(res, schedule, 'Schedule updated');
});

// DELETE /api/schedules/:id
export const remove = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  await deleteSchedule(req.params.id as string);
  sendSuccess(res, null, 'Schedule deleted');
});

// GET /api/branches/:branchId/schedules
export const getBranchWeeklySchedules = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const schedules = await getBranchSchedules(req.params.branchId as string);
  sendSuccess(res, schedules, 'Branch weekly schedules fetched');
});

// GET /api/branches/:branchId/courses/:courseId/schedule
export const getCourseBranchSchedule = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const schedules = await getBranchCourseSchedules(
    req.params.branchId as string,
    req.params.courseId as string
  );
  sendSuccess(res, schedules, 'Course schedule fetched');
});
