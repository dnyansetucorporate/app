import { Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';
import type { AuthRequest } from './auth.middleware.js';

/**
 * Middleware factory — restrict access to one or more roles.
 * Usage: requireRole('SUPER_ADMIN', 'BRANCH_ADMIN')
 */
export const requireRole =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      sendError(res, 'Forbidden — insufficient permissions', 403);
      return;
    }
    next();
  };

/**
 * Branch-scoping guard.
 * SUPER_ADMIN can pass any branchId they like.
 * BRANCH_ADMIN can only touch their own branch (resolved via req.user.branchId injected by auth middleware).
 * Call after `authenticate`. Reads branchId from req.query, req.params, or req.body — in that order.
 */
export const scopeBranch = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  if (req.user.role === 'SUPER_ADMIN') {
    // Super admin sees everything — no restriction
    next();
    return;
  }

  if (req.user.role === 'BRANCH_ADMIN') {
    const adminBranchId = req.user.branchId;

    // For PATCH / DELETE on /:id/:branchId routes we enforce via branchId param
    const requestedBranchId =
      (req.query.branchId as string | undefined) ||
      req.params.branchId ||
      (req.body as Record<string, unknown>)?.branchId as string | undefined;

    // If the route requires a specific branch and it doesn't match, reject
    if (requestedBranchId && requestedBranchId !== adminBranchId) {
      sendError(res, 'Forbidden — you can only access your own branch data', 403);
      return;
    }

    // Auto-inject branchId into query / body so downstream service always knows
    if (!req.query.branchId) (req.query as Record<string, unknown>).branchId = adminBranchId;
    next();
    return;
  }

  // Students cannot hit admin-only routes
  sendError(res, 'Forbidden — student access not permitted here', 403);
};

/**
 * Own-resource guard for STUDENT role.
 * Ensures a student can only access their own record.
 * Reads :studentId or :id param and compares against req.user.studentId.
 */
export const scopeSelf = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  if (req.user.role !== 'STUDENT') {
    // Admins bypass this guard
    next();
    return;
  }

  const targetId = req.params.studentId || req.params.id;
  if (targetId && targetId !== req.user.studentId) {
    sendError(res, 'Forbidden — you can only access your own data', 403);
    return;
  }

  next();
};
