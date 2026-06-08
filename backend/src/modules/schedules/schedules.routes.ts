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
  getBranchWeeklySchedules,
  getCourseBranchSchedule,
} from './schedules.controller.js';
import { createScheduleSchema, updateScheduleSchema } from './schedules.schema.js';

const router = Router();

// Require authentication for all schedule routes
router.use(authenticate);

// List schedules (SUPER_ADMIN, BRANCH_ADMIN)
router.get('/', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), list);

// Get specific schedule (SUPER_ADMIN, BRANCH_ADMIN)
router.get('/:id', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), get);

// Create schedule (SUPER_ADMIN, BRANCH_ADMIN)
router.post('/', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), validate(createScheduleSchema), create);

// Update schedule (SUPER_ADMIN, BRANCH_ADMIN)
router.patch('/:id', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), validate(updateScheduleSchema), update);

// Delete schedule (SUPER_ADMIN, BRANCH_ADMIN)
router.delete('/:id', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), remove);

// Get branch weekly schedule view
router.get('/branch/:branchId/weekly', getBranchWeeklySchedules);

// Get specific course schedule for a branch
router.get('/branch/:branchId/course/:courseId', getCourseBranchSchedule);

export default router;
