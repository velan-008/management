import { Router } from 'express';
import { brandController } from '../controllers/brand.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { brandSchema } from '../validations/product.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', brandController.list);
router.get('/:id', brandController.getById);
router.post('/', authorizeRoles('ADMIN', 'STAFF'), validate(brandSchema), brandController.create);
router.put('/:id', authorizeRoles('ADMIN'), validate(brandSchema), brandController.update);
router.delete('/:id', authorizeRoles('ADMIN'), brandController.delete);

export default router;

