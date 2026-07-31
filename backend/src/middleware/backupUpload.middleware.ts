import { Request, Response, NextFunction } from 'express';
import multer, { Multer } from 'multer';
import path from 'path';
import fs from 'fs';

const MAX_BACKUP_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_EXTENSIONS = ['.tar.gz', '.tgz'];
const RESTORE_UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'restore');

const hasAllowedExtension = (filename: string): boolean =>
  ALLOWED_EXTENSIONS.some((ext) => filename.toLowerCase().endsWith(ext));

/**
 * Multer instance for uploading a backup bundle to be restored.
 * Separate from `upload.middleware.ts`'s createUpload, which is hardcoded
 * to 1MB image-only uploads and not suitable for large archive files.
 */
export const backupUpload: Multer = (() => {
  fs.mkdirSync(RESTORE_UPLOAD_DIR, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: Function) => {
      cb(null, RESTORE_UPLOAD_DIR);
    },
    filename: (_req: Request, file: Express.Multer.File, cb: Function) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `restore-${uniqueSuffix}.tar.gz`);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: MAX_BACKUP_SIZE,
    },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: Function) => {
      if (!hasAllowedExtension(file.originalname)) {
        return cb(new Error(`Invalid file type. Expected a ${ALLOWED_EXTENSIONS.join(' or ')} backup archive`));
      }
      cb(null, true);
    },
  });
})();

export const handleBackupUploadError = (
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: `Backup file must not exceed ${MAX_BACKUP_SIZE / 1024 / 1024}MB`,
      });
      return;
    }
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  if (err && err.message) {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  next();
};
