import { Router } from 'express';
import { unitController } from '../controllers/unit.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { unitSchema } from '../validations/product.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', unitController.list);
router.get('/:id', unitController.getById);
router.post('/', authorizeRoles('ADMIN', 'STAFF'), validate(unitSchema), unitController.create);
router.put('/:id', authorizeRoles('ADMIN'), validate(unitSchema), unitController.update);
router.delete('/:id', authorizeRoles('ADMIN'), unitController.delete);

export default router;

