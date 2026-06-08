import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import {
  list,
  get,
  create,
  update,
  remove,
  getStudentPaymentsSummary,
} from './payments.controller.js';
import { createPaymentSchema, updatePaymentSchema } from './payments.schema.js';

const router = Router();

// Require authentication for all payment routes
router.use(authenticate);

// List payments (SUPER_ADMIN, BRANCH_ADMIN)
router.get('/', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), list);

// Get specific payment (SUPER_ADMIN, BRANCH_ADMIN)
router.get('/:id', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), get);

// Create payment (SUPER_ADMIN, BRANCH_ADMIN)
router.post('/', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), validate(createPaymentSchema), create);

// Update payment (SUPER_ADMIN, BRANCH_ADMIN)
router.patch('/:id', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), validate(updatePaymentSchema), update);

// Delete payment (SUPER_ADMIN only)
router.delete('/:id', requireRole('SUPER_ADMIN'), remove);

// Get student's payment summary (any authenticated user can view their own)
router.get('/student/:studentId/summary', getStudentPaymentsSummary);

export default router;
