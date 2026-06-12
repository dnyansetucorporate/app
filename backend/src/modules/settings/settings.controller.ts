import { Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import { clearDatabase } from './settings.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

export const clearDb = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  await clearDatabase(req.user!.id);
  sendSuccess(res, null, 'Database cleared successfully');
});
