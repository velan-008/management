import { Router } from 'express';
import { expenseController } from '../controllers/expense.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', expenseController.list);
router.post('/', expenseController.create);
router.put('/:id', expenseController.update);
router.delete('/:id', expenseController.delete);
router.patch('/:id/approve', authorizeRoles('ADMIN', 'MANAGER'), expenseController.approve);
router.patch('/:id/reject', authorizeRoles('ADMIN', 'MANAGER'), expenseController.reject);

export default router;
