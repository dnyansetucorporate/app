import { Router, Response, NextFunction } from 'express';
import { list, get, create, update, remove, createFollowUp } from './enquiries.controller.js';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware.js';
import { requireRole, scopeBranch } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createEnquirySchema, updateEnquirySchema, enquiryQuerySchema, createFollowUpSchema } from './enquiries.schema.js';

const router = Router();
router.use(authenticate);

// BRANCH_ADMIN enquiries always belong to their own branch — auto-fill before validation
// runs, so the frontend never has to know or send its own branchId.
const injectBranchId = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  if (req.user?.role === 'BRANCH_ADMIN' && !req.body.branchId) {
    req.body.branchId = req.user.branchId;
  }
  next();
};

router.get('/', scopeBranch, validate(enquiryQuerySchema, 'query'), list);
router.get('/:id', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), get);
router.post('/',
  requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'),
  injectBranchId,
  validate(createEnquirySchema),
  create
);
router.patch('/:id',
  requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'),
  validate(updateEnquirySchema),
  update
);
router.delete('/:id', requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), remove);

router.post('/:id/follow-ups',
  requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'),
  validate(createFollowUpSchema),
  createFollowUp
);

export default router;
