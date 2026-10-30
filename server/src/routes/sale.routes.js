import { Router } from 'express';
import { saleController } from '../controllers/sale.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', saleController.list);
router.post('/', saleController.create);
router.get('/:id', saleController.getById);
router.post('/:id/payments', saleController.addPayment);
router.post('/:id/refund', authorizeRoles('ADMIN', 'MANAGER'), saleController.refund);

export default router;
