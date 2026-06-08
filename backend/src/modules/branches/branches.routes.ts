import { Router } from 'express';
import path from 'path';
import { list, stats, get, create, update, remove } from './branches.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createBranchSchema, updateBranchSchema, branchQuerySchema } from './branches.schema.js';
import { createUpload, handleUploadError, formatFilePath, validateMagicBytes } from '../../middleware/upload.middleware.js';

const router = Router();
router.use(authenticate);

// Configure multer with file validation
const uploadsDir = path.join(process.cwd(), 'uploads', 'branches');
const upload = createUpload(uploadsDir);

// Normalize payload keys so frontend/curl can send alternate names
const normalizeBranchPayload = (req: any, _res: any, next: any) => {
	const b = req.body || {};
	if (b.branchName && !b.name) b.name = b.branchName;
	if (b.email && !b.adminEmail) b.adminEmail = b.email;
	if (b.password && !b.adminPassword) b.adminPassword = b.password;
	next();
};

// Attach formatFilePath to request for use in controller
export const attachFormatFilePath = (req: any, _res: any, next: any) => {
	req.formatFilePath = (filename: string) => formatFilePath('uploads/branches', filename);
	next();
};

router.get('/stats', stats);
router.get('/',     validate(branchQuerySchema, 'query'), list);
router.get('/:id',  get);

// Only SUPER_ADMIN can create / modify / delete branches
router.post('/',
	requireRole('SUPER_ADMIN'),
	upload.fields([
		{ name: 'logo', maxCount: 1 },
		{ name: 'aadharImage', maxCount: 1 },
		{ name: 'panImage', maxCount: 1 },
	]),
	handleUploadError,
	validateMagicBytes,
	normalizeBranchPayload,
	attachFormatFilePath,
	validate(createBranchSchema),
	create
);
router.patch('/:id',
	requireRole('SUPER_ADMIN'),
	upload.fields([
		{ name: 'logo', maxCount: 1 },
		{ name: 'aadharImage', maxCount: 1 },
		{ name: 'panImage', maxCount: 1 },
	]),
	handleUploadError,
	validateMagicBytes,
	normalizeBranchPayload,
	attachFormatFilePath,
	validate(updateBranchSchema),
	update
);
router.delete('/:id', requireRole('SUPER_ADMIN'), remove);

export default router;
