import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);
router.use(authorizeRoles('ADMIN', 'MANAGER'));

router.get('/', employeeController.list);
router.get('/:id', employeeController.getById);
router.post('/', employeeController.create);
router.put('/:id', employeeController.update);
router.patch('/:id/deactivate', employeeController.deactivate);
router.put('/:id/deactivate', employeeController.deactivate);
router.delete('/:id', employeeController.deactivate);
router.post('/:id/attendance', employeeController.recordAttendance);
router.get('/:id/attendance', employeeController.getAttendance);
router.post('/:id/salary', employeeController.recordSalary);
router.get('/:id/salaries', employeeController.getSalaries);

export default router;
