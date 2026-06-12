import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { clearDb } from './settings.controller.js';

const router = Router();

router.post('/clear-db', authenticate, requireRole('SUPER_ADMIN'), clearDb);

export default router;
