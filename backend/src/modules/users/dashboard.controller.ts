import { Response } from 'express';
import { sendSuccess, getPaginationParams, buildPaginationMeta } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getStats, getPerformanceData, getEnrollmentData, getRecentStudents } from './dashboard.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

// GET /api/dashboard/stats
export const stats = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { branchId, from, to } = req.query as { branchId?: string; from?: string; to?: string };
  const scopedBranchId = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : branchId;
  const data = await getStats(scopedBranchId, from, to);
  sendSuccess(res, data);
});

// GET /api/dashboard/performance
export const performance = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { branchId, from, to } = req.query as { branchId?: string; from?: string; to?: string };
  const scopedBranchId = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : branchId;
  const data = await getPerformanceData(scopedBranchId, from, to);
  sendSuccess(res, data);
});

// GET /api/dashboard/enrollment
export const enrollment = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { branchId } = req.query as { branchId?: string };
  const scopedBranchId = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : branchId;
  const data = await getEnrollmentData(scopedBranchId);
  sendSuccess(res, data);
});

// GET /api/dashboard/recent-students
export const recentStudents = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { branchId, from, to, search } = req.query as { branchId?: string; from?: string; to?: string; search?: string };
  const scopedBranchId = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : branchId;
  const { page, limit, skip, take } = getPaginationParams(req.query, 8);
  const { students, total } = await getRecentStudents(scopedBranchId, from, to, skip, take, search);
  sendSuccess(res, students, 'Recent students fetched', 200, buildPaginationMeta(total, page, limit));
});
