import { Request, Response, NextFunction } from 'express';
import multer, { Multer } from 'multer';
import path from 'path';
import fs from 'fs';

// Configuration
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/jfif', 'image/pjpeg'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.jfif'];

/**
 * Magic-byte signatures for allowed image formats.
 * Checked after multer writes the file to disk to prevent extension-spoofing.
 */
const IMAGE_MAGIC_BYTES: { signature: number[]; offset: number }[] = [
  { signature: [0xFF, 0xD8, 0xFF], offset: 0 },            // JPEG / JFIF / PJPEG
  { signature: [0x89, 0x50, 0x4E, 0x47], offset: 0 },      // PNG
  { signature: [0x47, 0x49, 0x46], offset: 0 },             // GIF (GIF87a / GIF89a)
  { signature: [0x52, 0x49, 0x46, 0x46], offset: 0 },       // WebP (RIFF header)
];

const verifyMagicBytes = (filePath: string): boolean => {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  return IMAGE_MAGIC_BYTES.some(({ signature, offset }) =>
    signature.every((byte, i) => buf[offset + i] === byte)
  );
};

/**
 * Post-upload middleware that validates magic bytes of uploaded files.
 * Must be placed after multer middleware.
 */
export const validateMagicBytes = (req: Request, res: Response, next: NextFunction): void => {
  const files: Express.Multer.File[] = [];
  if ((req as any).file) files.push((req as any).file);
  if ((req as any).files) {
    const f = (req as any).files;
    if (Array.isArray(f)) {
      files.push(...f);
    } else {
      Object.values(f).forEach((arr: any) => files.push(...arr));
    }
  }

  for (const file of files) {
    if (!verifyMagicBytes(file.path)) {
      fs.unlinkSync(file.path); // delete the suspicious file
      res.status(400).json({
        success: false,
        message: 'Uploaded file content does not match a supported image format',
      });
      return;
    }
  }
  next();
};

/**
 * Create multer instance with specific upload directory
 */
export const createUpload = (uploadDir: string): Multer => {
  // Ensure directory exists
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: Function) => {
      cb(null, uploadDir);
    },
    filename: (_req: Request, file: Express.Multer.File, cb: Function) => {
      // Create unique filename: timestamp-random-originalname
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      cb(null, `${name}-${uniqueSuffix}${ext}`);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: Function) => {
      // Check MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(
          new Error(
            `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
          )
        );
      }

      // Check file extension
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return cb(
          new Error(
            `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`
          )
        );
      }

      cb(null, true);
    },
  });
};

/**
 * Middleware to handle multer errors and format file path
 */
export const handleUploadError = (
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: `File size must not exceed ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
      return;
    }
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err && err.message) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }

  next();
};

/**
 * Format file path to include directory prefix
 */
export const formatFilePath = (baseDir: string, filename: string): string => {
  if (!filename) return '';
  // Ensure path uses forward slashes for consistency
  return `${baseDir}/${filename}`.replace(/\\/g, '/');
};
