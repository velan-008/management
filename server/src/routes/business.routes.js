import { Router } from 'express';
import { businessController } from '../controllers/business.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/me', businessController.getMe);
router.put('/me', authorizeRoles('ADMIN'), businessController.updateMe);

export default router;
