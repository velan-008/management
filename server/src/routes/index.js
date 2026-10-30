import { Router } from 'express';
import { sequelize } from '../database/connection.js';
import { apiResponse } from '../utils/apiResponse.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import authRoutes from './auth.routes.js';
import reportRoutes from './report.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import customerRoutes from './customer.routes.js';
import saleRoutes from './sale.routes.js';
import expenseRoutes from './expense.routes.js';
import employeeRoutes from './employee.routes.js';
import businessRoutes from './business.routes.js';
import supplierRoutes from './supplier.routes.js';
import purchaseRoutes from './purchase.routes.js';

const router = Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  let dbStatus = 'UP';
  try {
    await sequelize.authenticate();
  } catch {
    dbStatus = 'DOWN';
  }

  return apiResponse.success(
    res,
    {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: dbStatus
    },
    'Service is healthy'
  );
});

// Authentication routes
router.use('/auth', authRoutes);

// Report & Dashboard routes
router.use('/reports', reportRoutes);

// Business resource routes
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/customers', customerRoutes);
router.use('/sales', saleRoutes);
router.use('/expenses', expenseRoutes);
router.use('/employees', employeeRoutes);
router.use('/businesses', businessRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchases', purchaseRoutes);

// Admin-only test endpoint (for RBAC & privilege verification)
router.get('/admin/verify-access', authenticate, authorizeRoles('ADMIN'), (req, res) => {
  return apiResponse.success(
    res,
    {
      adminId: req.user.id,
      businessId: req.businessId,
      role: req.user.role
    },
    'Admin privileges verified successfully'
  );
});

export default router;
