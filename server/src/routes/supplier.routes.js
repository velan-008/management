import { Router } from 'express';
import { supplierController } from '../controllers/supplier.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);

// Staff and Admin can view suppliers (e.g. for creating purchase request or contacting)
router.get('/', supplierController.list);
router.get('/:id', supplierController.getById);

// Admin-only management
router.post('/', authorizeRoles('ADMIN', 'MANAGER'), supplierController.create);
router.put('/:id', authorizeRoles('ADMIN', 'MANAGER'), supplierController.update);
router.delete('/:id', authorizeRoles('ADMIN'), supplierController.delete);
router.post('/:id/payments', authorizeRoles('ADMIN', 'MANAGER'), supplierController.recordPayment);

export default router;

