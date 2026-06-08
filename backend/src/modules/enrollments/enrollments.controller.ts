import { Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  listEnrollments,
  getEnrollmentById,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
  getStudentCourseEnrollments,
} from './enrollments.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

// GET /api/enrollments
export const list = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const scopedBranch = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : undefined;
  const { enrollments, meta } = await listEnrollments(req.query as Record<string, unknown>, scopedBranch);
  sendSuccess(res, enrollments, 'Enrollments fetched', 200, meta);
});

// GET /api/enrollments/:id
export const get = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const enrollment = await getEnrollmentById(req.params.id as string);
  sendSuccess(res, enrollment);
});

// POST /api/enrollments
export const create = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  // Ensure branchId is set for BRANCH_ADMIN
  if (req.user?.role === 'BRANCH_ADMIN' && !req.body.branchId) {
    req.body.branchId = req.user.branchId;
  }

  const enrollment = await createEnrollment(req.body);
  sendSuccess(res, enrollment, 'Enrollment created', 201);
});

// PATCH /api/enrollments/:id
export const update = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const enrollment = await updateEnrollment(req.params.id as string, req.body);
  sendSuccess(res, enrollment, 'Enrollment updated');
});

// DELETE /api/enrollments/:id
export const remove = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  await deleteEnrollment(req.params.id as string);
  sendSuccess(res, null, 'Enrollment deleted');
});

// GET /api/students/:studentId/enrollments
export const getStudentEnrollments = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const enrollments = await getStudentCourseEnrollments(req.params.studentId as string);
  sendSuccess(res, enrollments, 'Student enrollments fetched');
});
