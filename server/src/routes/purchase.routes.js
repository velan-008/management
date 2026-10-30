import { Router } from 'express';
import { purchaseController } from '../controllers/purchase.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);

// List and get purchases
router.get('/', purchaseController.list);
router.get('/:id', purchaseController.getById);

// Admin / authorized manager routes for purchase orders
router.post('/', authorizeRoles('ADMIN', 'MANAGER'), purchaseController.create);
router.post('/:id/receive', authorizeRoles('ADMIN', 'MANAGER'), purchaseController.receiveGoods);
router.post('/:id/payments', authorizeRoles('ADMIN', 'MANAGER'), purchaseController.recordPayment);
router.post('/:id/cancel', authorizeRoles('ADMIN', 'MANAGER'), purchaseController.cancel);

export default router;

