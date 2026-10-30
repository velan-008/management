import { Router } from 'express';
import { categoryController } from '../controllers/category.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { categorySchema } from '../validations/product.validation.js';

const router = Router();

// All category routes require authentication
router.use(authenticate);

// Category routes
router.get('/', categoryController.list);
router.get('/:id', categoryController.getById);
router.post('/', authorizeRoles('ADMIN', 'STAFF'), validate(categorySchema), categoryController.create);
router.put('/:id', authorizeRoles('ADMIN'), validate(categorySchema), categoryController.update);
router.delete('/:id', authorizeRoles('ADMIN'), categoryController.delete);

export default router;
