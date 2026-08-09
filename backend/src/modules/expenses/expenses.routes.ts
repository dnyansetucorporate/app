import { Router } from 'express';
import { list, get, create, update, remove } from './expenses.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createExpenseSchema, updateExpenseSchema, expenseQuerySchema } from './expenses.schema.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

router.get('/', validate(expenseQuerySchema, 'query'), list);
router.get('/:id', get);
router.post('/', validate(createExpenseSchema), create);
router.patch('/:id', validate(updateExpenseSchema), update);
router.delete('/:id', remove);

export default router;
