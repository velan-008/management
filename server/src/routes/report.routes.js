import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);

// Dashboard metrics
router.get('/dashboard', reportController.getDashboard);

// P&L and Sales reports
router.get('/profit-loss', reportController.getProfitLoss);
router.get('/sales-summary', reportController.getSalesSummary);
router.get('/inventory', reportController.getInventory);

// CSV Data Export with formula injection protection
router.get('/export/:type', reportController.exportCsv);

export default router;
