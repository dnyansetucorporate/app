import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isProd = process.env.NODE_ENV === 'production';

  // Log full error only in non-production environments
  if (!isProd) console.error(err);

  // Prisma unique constraint violation
  if (err?.code === 'P2002') {
    const field = err.meta?.target?.[0] ?? 'field';
    sendError(res, `A record with this ${field} already exists`, 409);
    return;
  }

  // Prisma record not found
  if (err?.code === 'P2025') {
    sendError(res, 'Record not found', 404);
    return;
  }

  const status = err.status || 500;
  const message = isProd && status === 500 ? 'Internal Server Error' : (err.message || 'Internal Server Error');

  sendError(res, message, status);
};
