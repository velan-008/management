import { Router } from 'express';
import { invoiceController } from '../controllers/invoice.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);

// Manager & Staff can both create invoices, view invoices, and print receipts
router.get('/', invoiceController.list);
router.post('/sync-batch', authorizeRoles('ADMIN', 'STAFF'), invoiceController.syncBatch);
router.get('/:id', invoiceController.getById);
router.post('/', authorizeRoles('ADMIN', 'STAFF'), invoiceController.create);

export default router;

