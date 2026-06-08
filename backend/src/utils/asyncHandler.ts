import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async route handler so any thrown error is forwarded to
 * the global Express error handler — no try/catch boilerplate needed.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
