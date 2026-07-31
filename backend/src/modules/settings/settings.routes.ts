import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { requireRole as requireRoleCurrent } from '../../middleware/role.middleware.js';
import { backupUpload, handleBackupUploadError } from '../../middleware/backupUpload.middleware.js';
import { clearDb, exportBackup, importBackup } from './settings.controller.js';

const router = Router();

router.post('/clear-db', authenticate, requireRole('SUPER_ADMIN'), clearDb);

router.get('/backup/export', authenticate, requireRoleCurrent('SUPER_ADMIN'), exportBackup);

router.post(
  '/backup/import',
  authenticate,
  requireRoleCurrent('SUPER_ADMIN'),
  backupUpload.single('backup'),
  handleBackupUploadError,
  importBackup
);

export default router;
