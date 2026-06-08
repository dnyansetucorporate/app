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
  getStudentEnrollments,
} from './enrollments.controller.js';
import { createEnrollmentSchema, updateEnrollmentSchema } from './enrollments.schema.js';

const router = Router();

// Require authentication for all enrollment routes
router.use(authenticate);

// List enrollments (SUPER_ADMIN, BRANCH_ADMIN)
router.get('/', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), list);

// Get specific enrollment (SUPER_ADMIN, BRANCH_ADMIN)
router.get('/:id', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), get);

// Create enrollment (SUPER_ADMIN, BRANCH_ADMIN)
router.post('/', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), validate(createEnrollmentSchema), create);

// Update enrollment (SUPER_ADMIN, BRANCH_ADMIN)
router.patch('/:id', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), validate(updateEnrollmentSchema), update);

// Delete enrollment (SUPER_ADMIN, BRANCH_ADMIN)
router.delete('/:id', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), remove);

// Get student's enrollments (any authenticated user can view their own)
router.get('/student/:studentId/courses', getStudentEnrollments);

export default router;
