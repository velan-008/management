import { Op } from 'sequelize';
import Decimal from 'decimal.js';
import {
  sequelize, Employee, User, Attendance, Salary, AuditLog
} from '../models/index.js';
import { apiResponse } from '../utils/apiResponse.js';

function formatEmployee(emp) {
  const plain = emp.toJSON ? emp.toJSON() : emp;
  const fullName = `${plain.first_name || ''} ${plain.last_name || ''}`.trim() || 'Employee';
  return {
    ...plain,
    name: fullName,
    position: plain.designation,
    salary_amount: plain.base_salary,
    salary_type: 'MONTHLY',
    join_date: plain.joining_date,
    is_active: plain.status === 'ACTIVE'
  };
}

export const employeeController = {
  /**
   * GET /api/employees — List all employees
   */
  list: async (req, res, next) => {
    try {
      const { search = '', status } = req.query;
      const where = { business_id: req.businessId };

      if (status) where.status = status;
      if (search.trim()) {
        const query = `%${search.trim()}%`;
        where[Op.or] = [
          { first_name: { [Op.like]: query } },
          { last_name: { [Op.like]: query } },
          { designation: { [Op.like]: query } },
          { department: { [Op.like]: query } },
          { email: { [Op.like]: query } },
          { phone: { [Op.like]: query } }
        ];
      }

      const employees = await Employee.findAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            required: false,
            attributes: ['id', 'name', 'email', 'role', 'is_active']
          }
        ],
        order: [['first_name', 'ASC']]
      });

      const formatted = employees.map(formatEmployee);
      return apiResponse.success(res, { employees: formatted }, 'Employees retrieved');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/employees/:id — Single employee details
   */
  getById: async (req, res, next) => {
    try {
      const employee = await Employee.findOne({
        where: { id: req.params.id, business_id: req.businessId },
        include: [
          {
            model: User,
            as: 'user',
            required: false,
            attributes: ['id', 'name', 'email', 'role', 'is_active']
          }
        ]
      });
      if (!employee) return apiResponse.error(res, 'Employee not found', 404, 'NOT_FOUND');
      return apiResponse.success(res, { employee: formatEmployee(employee) }, 'Employee retrieved');
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/employees — Create an employee record (no user account created)
   */
  create: async (req, res, next) => {
    try {
      const {
        name,
        first_name,
        last_name,
        email,
        phone,
        position,
        designation,
        department,
        salary_amount,
        base_salary,
        join_date,
        joining_date,
        status = 'ACTIVE'
      } = req.body;

      let fName = (first_name || '').trim();
      let lName = (last_name || '').trim();
      if (!fName && name) {
        const parts = name.trim().split(' ');
        fName = parts[0] || 'Employee';
        lName = parts.slice(1).join(' ') || '.';
      }

      if (!fName) {
        return apiResponse.error(res, 'Employee first name or full name is required', 400, 'VALIDATION_ERROR');
      }

      if (!lName) {
        lName = '.';
      }

      const empEmail = email ? email.trim().toLowerCase() : null;
      const desig = (designation || position || 'Staff').trim();
      const bSalary = parseFloat(base_salary !== undefined ? base_salary : salary_amount) || 0;
      const jDate = joining_date || join_date || new Date().toISOString().slice(0, 10);
      const empStatus = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'].includes(status) ? status : 'ACTIVE';

      // Create only in employees table - do NOT create a user record in users table
      const employee = await Employee.create({
        business_id: req.businessId,
        user_id: null,
        first_name: fName,
        last_name: lName,
        email: empEmail,
        phone: phone ? phone.trim() : null,
        designation: desig,
        department: department ? department.trim() : null,
        base_salary: bSalary,
        joining_date: jDate,
        status: empStatus
      });

      await AuditLog.create({
        business_id: req.businessId,
        user_id: req.user?.id || null,
        action: 'EMPLOYEE_CREATE',
        entity: 'Employee',
        entity_id: String(employee.id),
        changes: { name: `${fName} ${lName}`.trim(), designation: desig, status: empStatus },
        ip_address: req.ip || null
      });

      return apiResponse.success(
        res,
        { employee: formatEmployee(employee) },
        'Employee created successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/employees/:id — Update employee
   */
  update: async (req, res, next) => {
    try {
      const employee = await Employee.findOne({
        where: { id: req.params.id, business_id: req.businessId },
        include: [{ model: User, as: 'user', required: false }]
      });
      if (!employee) return apiResponse.error(res, 'Employee not found', 404, 'NOT_FOUND');

      const {
        name,
        first_name,
        last_name,
        email,
        phone,
        position,
        designation,
        department,
        salary_amount,
        base_salary,
        join_date,
        joining_date,
        status
      } = req.body;

      let fName = employee.first_name;
      let lName = employee.last_name;
      if (first_name !== undefined) fName = first_name.trim();
      if (last_name !== undefined) lName = last_name.trim();
      if (name && first_name === undefined) {
        const parts = name.trim().split(' ');
        fName = parts[0] || fName;
        lName = parts.slice(1).join(' ') || lName;
      }

      const desig = designation !== undefined ? designation : (position !== undefined ? position : employee.designation);
      const bSalary = base_salary !== undefined ? parseFloat(base_salary) : (salary_amount !== undefined ? parseFloat(salary_amount) : employee.base_salary);
      const jDate = joining_date !== undefined ? joining_date : (join_date !== undefined ? join_date : employee.joining_date);
      const empStatus = status !== undefined && ['ACTIVE', 'ON_LEAVE', 'TERMINATED'].includes(status) ? status : employee.status;

      await employee.update({
        first_name: fName,
        last_name: lName,
        email: email !== undefined ? (email ? email.trim().toLowerCase() : null) : employee.email,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : employee.phone,
        designation: desig,
        department: department !== undefined ? (department ? department.trim() : null) : employee.department,
        base_salary: bSalary,
        joining_date: jDate,
        status: empStatus
      });

      if (employee.user) {
        const userUpdates = { name: `${fName} ${lName}`.trim() };
        if (empStatus === 'TERMINATED') userUpdates.is_active = false;
        await employee.user.update(userUpdates);
      }

      await AuditLog.create({
        business_id: req.businessId,
        user_id: req.user?.id || null,
        action: 'EMPLOYEE_UPDATE',
        entity: 'Employee',
        entity_id: String(employee.id),
        changes: { designation: desig, status: empStatus },
        ip_address: req.ip || null
      });

      return apiResponse.success(res, { employee: formatEmployee(employee) }, 'Employee updated successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH/PUT/DELETE /api/employees/:id/deactivate — Deactivate employee
   */
  deactivate: async (req, res, next) => {
    try {
      const employee = await Employee.findOne({
        where: { id: req.params.id, business_id: req.businessId },
        include: [{ model: User, as: 'user', required: false }]
      });
      if (!employee) return apiResponse.error(res, 'Employee not found', 404, 'NOT_FOUND');

      await employee.update({ status: 'TERMINATED' });

      if (employee.user) {
        await employee.user.update({ is_active: false });
      }

      await AuditLog.create({
        business_id: req.businessId,
        user_id: req.user?.id || null,
        action: 'EMPLOYEE_DEACTIVATE',
        entity: 'Employee',
        entity_id: String(employee.id),
        changes: { status: 'TERMINATED' },
        ip_address: req.ip || null
      });

      return apiResponse.success(res, { employee: formatEmployee(employee) }, 'Employee deactivated successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/employees/:id/attendance — Record attendance
   */
  recordAttendance: async (req, res, next) => {
    try {
      const employee = await Employee.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });
      if (!employee) return apiResponse.error(res, 'Employee not found', 404, 'NOT_FOUND');

      const {
        date,
        status = 'PRESENT',
        check_in,
        check_in_time,
        check_out,
        check_out_time,
        notes
      } = req.body;

      const attDate = date || new Date().toISOString().slice(0, 10);
      const validStatuses = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY'];
      const attStatus = validStatuses.includes(status) ? status : 'PRESENT';

      // Check duplicate attendance for employee on date
      const existing = await Attendance.findOne({
        where: {
          business_id: req.businessId,
          employee_id: employee.id,
          date: attDate
        }
      });

      if (existing) {
        return apiResponse.error(
          res,
          `Attendance for employee ${employee.first_name} on ${attDate} is already recorded as ${existing.status}`,
          409,
          'DUPLICATE_ATTENDANCE'
        );
      }

      const attendance = await Attendance.create({
        business_id: req.businessId,
        employee_id: employee.id,
        date: attDate,
        status: attStatus,
        check_in_time: check_in_time || check_in || null,
        check_out_time: check_out_time || check_out || null,
        notes: notes || null
      });

      await AuditLog.create({
        business_id: req.businessId,
        user_id: req.user.id,
        action: 'ATTENDANCE_RECORD',
        entity: 'Attendance',
        entity_id: String(attendance.id),
        changes: { employee_id: employee.id, date: attDate, status: attStatus },
        ip_address: req.ip || null
      });

      return apiResponse.success(res, { attendance }, 'Attendance recorded successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/employees/:id/attendance — Get employee attendance
   */
  getAttendance: async (req, res, next) => {
    try {
      const employee = await Employee.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });
      if (!employee) return apiResponse.error(res, 'Employee not found', 404, 'NOT_FOUND');

      const { month, year, date_from, date_to } = req.query;
      const where = { employee_id: employee.id, business_id: req.businessId };

      if (month && year) {
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        const start = `${y}-${String(m).padStart(2, '0')}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        where.date = { [Op.between]: [start, end] };
      } else if (date_from || date_to) {
        where.date = {};
        if (date_from) where.date[Op.gte] = date_from;
        if (date_to) where.date[Op.lte] = date_to;
      }

      const records = await Attendance.findAll({
        where,
        order: [['date', 'DESC']]
      });

      return apiResponse.success(res, { attendance: records }, 'Attendance records retrieved');
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/employees/:id/salary — Record salary payment
   */
  recordSalary: async (req, res, next) => {
    try {
      const employee = await Employee.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });
      if (!employee) return apiResponse.error(res, 'Employee not found', 404, 'NOT_FOUND');

      const {
        month,
        year,
        amount,
        base_amount,
        bonus_amount = 0,
        deductions = 0,
        payment_method = 'BANK_TRANSFER',
        payment_status = 'PAID',
        payment_date,
        notes
      } = req.body;

      const now = new Date();
      const salMonth = parseInt(month || (now.getMonth() + 1), 10);
      const salYear = parseInt(year || now.getFullYear(), 10);

      if (salMonth < 1 || salMonth > 12) {
        return apiResponse.error(res, 'Month must be between 1 and 12', 400, 'VALIDATION_ERROR');
      }

      // Check duplicate salary for same employee, month, year
      const existing = await Salary.findOne({
        where: {
          business_id: req.businessId,
          employee_id: employee.id,
          month: salMonth,
          year: salYear
        }
      });

      if (existing) {
        return apiResponse.error(
          res,
          `Salary for employee ${employee.first_name} for period ${salMonth}/${salYear} is already recorded`,
          409,
          'DUPLICATE_SALARY'
        );
      }

      const base = new Decimal(base_amount !== undefined ? base_amount : (amount !== undefined ? amount : employee.base_salary));
      const bonus = new Decimal(bonus_amount || 0);
      const ded = new Decimal(deductions || 0);
      const net = Decimal.max(0, base.plus(bonus).minus(ded));

      const acceptedMethods = ['BANK_TRANSFER', 'CASH', 'CHEQUE', 'OTHER'];
      const validMethod = acceptedMethods.includes(payment_method) ? payment_method : 'BANK_TRANSFER';
      const validStatus = ['PENDING', 'PAID', 'CANCELLED'].includes(payment_status) ? payment_status : 'PAID';

      const salary = await Salary.create({
        business_id: req.businessId,
        employee_id: employee.id,
        month: salMonth,
        year: salYear,
        base_amount: base.toFixed(2),
        bonus_amount: bonus.toFixed(2),
        deductions: ded.toFixed(2),
        net_amount: net.toFixed(2),
        payment_status: validStatus,
        payment_date: validStatus === 'PAID' ? (payment_date || now.toISOString().slice(0, 10)) : null,
        payment_method: validMethod,
        notes: notes || null
      });

      await AuditLog.create({
        business_id: req.businessId,
        user_id: req.user.id,
        action: 'SALARY_RECORD',
        entity: 'Salary',
        entity_id: String(salary.id),
        changes: {
          employee_id: employee.id,
          month: salMonth,
          year: salYear,
          net_amount: net.toFixed(2)
        },
        ip_address: req.ip || null
      });

      return apiResponse.success(res, { salary }, 'Salary recorded successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/employees/:id/salaries — Salary history for employee
   */
  getSalaries: async (req, res, next) => {
    try {
      const employee = await Employee.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });
      if (!employee) return apiResponse.error(res, 'Employee not found', 404, 'NOT_FOUND');

      const salaries = await Salary.findAll({
        where: { employee_id: employee.id, business_id: req.businessId },
        order: [['year', 'DESC'], ['month', 'DESC']]
      });

      return apiResponse.success(res, { salaries }, 'Salary history retrieved');
    } catch (error) {
      next(error);
    }
  }
};
