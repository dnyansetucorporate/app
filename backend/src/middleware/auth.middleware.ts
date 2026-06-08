import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * Verifies Bearer JWT and attaches decoded payload to req.user.
 * The payload now includes optional branchId / studentId for RBAC scope guards.
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    sendError(res, 'Unauthorized — token missing', 401);
    return;
  }
  const token = header.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    sendError(res, 'Unauthorized — invalid or expired token', 401);
  }
};

/**
 * @deprecated — use requireRole from role.middleware instead.
 * Kept for backward-compat while routes are migrated.
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
