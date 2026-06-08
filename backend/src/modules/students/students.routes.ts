import { Router } from 'express';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { list, get, create, update, remove, listEnrollments, enroll, validatePassword } from './students.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole, scopeBranch, scopeSelf } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createStudentSchema, updateStudentSchema, studentQuerySchema } from './students.schema.js';
import { createUpload, handleUploadError, formatFilePath, validateMagicBytes } from '../../middleware/upload.middleware.js';

const validatePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password validation attempts, please try again later' },
});

const router = Router();
router.use(authenticate);

// Configure multer with file validation
const uploadsDir = path.join(process.cwd(), 'uploads', 'students');
const upload = createUpload(uploadsDir);

// Attach formatFilePath to request for use in controller
export const attachFormatFilePath = (req: any, _res: any, next: any) => {
	req.formatFilePath = (filename: string) => formatFilePath('uploads/students', filename);
	next();
};

// List — SUPER_ADMIN sees all; BRANCH_ADMIN auto-scoped to their branch via scopeBranch
router.get('/',
  scopeBranch,
  validate(studentQuerySchema, 'query'),
  list
);

// Detail — own data for STUDENT, any for admins
router.get('/:id', scopeSelf, get);

// Create / Update / Delete — BRANCH_ADMIN can create in their own branch only
router.post('/',
  requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'),
  upload.single('photo'),
  handleUploadError,
  validateMagicBytes,
  attachFormatFilePath,
  validate(createStudentSchema),
  create
);
router.patch('/:id',
  requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'),
  upload.single('photo'),
  handleUploadError,
  validateMagicBytes,
  attachFormatFilePath,
  validate(updateStudentSchema),
  update
);
router.delete('/:id', requireRole('SUPER_ADMIN'), remove);

// POST /api/students/validate-password - Validate exam password (rate-limited, auth required)
router.post('/validate-password', validatePasswordLimiter, authenticate, validatePassword);

// Enrollments
router.get('/:id/enrollments',  scopeSelf, listEnrollments);
router.post('/:id/enrollments', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), enroll);

export default router;
