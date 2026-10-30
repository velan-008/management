import { Router } from 'express';
import { productController } from '../controllers/product.controller.js';
import { categoryController } from '../controllers/category.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  adjustStockSchema,
  categorySchema
} from '../validations/product.validation.js';

const router = Router();

// All product routes require authentication + business scope
router.use(authenticate);

// Category subroutes mounted under /api/products/categories for backwards compatibility
router.get('/categories', categoryController.list);
router.post('/categories', authorizeRoles('ADMIN', 'STAFF'), validate(categorySchema), categoryController.create);
router.put('/categories/:id', authorizeRoles('ADMIN'), validate(categorySchema), categoryController.update);
router.delete('/categories/:id', authorizeRoles('ADMIN'), categoryController.delete);

// Global movements ledger across all products
router.get('/movements', productController.allMovements);

// Product CRUD routes
router.get('/', productController.list);
router.get('/:id', productController.getById);
router.post('/', authorizeRoles('ADMIN', 'STAFF'), validate(createProductSchema), productController.create);
router.put('/:id', authorizeRoles('ADMIN', 'STAFF'), validate(updateProductSchema), productController.update);
router.delete('/:id', authorizeRoles('ADMIN'), productController.delete);

// Stock adjustment and movement audit ledger for specific product
router.post('/:id/adjust-stock', authorizeRoles('ADMIN', 'STAFF'), validate(adjustStockSchema), productController.adjustStock);
router.get('/:id/movements', productController.stockMovements);

export default router;
