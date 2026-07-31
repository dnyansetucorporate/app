import { Response } from 'express';
import fs from 'fs';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendError, sendSuccess } from '../../utils/response.js';
import { clearDatabase } from './settings.service.js';
import { createBackupArchive, restoreBackupArchive } from './backup.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

export const clearDb = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  await clearDatabase(req.user!.sub);
  sendSuccess(res, null, 'Database cleared successfully');
});

export const exportBackup = asyncHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
  const { filePath, filename, cleanup } = await createBackupArchive();
  res.download(filePath, filename, (err) => {
    cleanup();
    if (err && !res.headersSent) {
      sendError(res, 'Failed to download backup', 500);
    }
  });
});

export const importBackup = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    sendError(res, 'No backup file uploaded', 400);
    return;
  }

  try {
    await restoreBackupArchive(req.file.path);
    sendSuccess(res, null, 'Backup restored successfully');
  } finally {
    fs.rm(req.file.path, { force: true }, () => {});
  }
});
