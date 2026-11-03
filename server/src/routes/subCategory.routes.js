import { Router } from 'express';
import { subCategoryController } from '../controllers/subCategory.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { subCategorySchema } from '../validations/product.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', subCategoryController.list);
router.get('/:id', subCategoryController.getById);
router.post('/', authorizeRoles('ADMIN', 'STAFF'), validate(subCategorySchema), subCategoryController.create);
router.put('/:id', authorizeRoles('ADMIN'), validate(subCategorySchema), subCategoryController.update);
router.delete('/:id', authorizeRoles('ADMIN'), subCategoryController.delete);

export default router;

