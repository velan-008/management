import './setup.js';
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { Employee, User, Attendance, Salary } from '../src/models/index.js';

describe('BUSINESSFLOW — Stage 7 Employees & HR Management Tests', () => {
  let adminToken;
  let staffToken;
  let biz2Token;

  beforeAll(async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@apexretail.com', password: 'Admin@123456' });
    adminToken = adminRes.body.data.token;

    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@apexretail.com', password: 'Staff@123456' });
    staffToken = staffRes.body.data.token;

    const biz2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@novaagency.com', password: 'Admin@123456' });
    biz2Token = biz2Res.body.data.token;
  });

  it('should allow Manager/Admin to add an employee without creating a user account', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'David Miller',
        email: 'david.miller@apexretail.com',
        phone: '+1-555-444-1212',
        position: 'Inventory Specialist',
        department: 'Warehouse',
        salary_amount: 3500,
        join_date: '2026-01-15'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.employee.first_name).toBe('David');
    expect(res.body.data.employee.last_name).toBe('Miller');
    expect(res.body.data.employee.designation).toBe('Inventory Specialist');
    expect(parseFloat(res.body.data.employee.base_salary)).toBe(3500);
    expect(res.body.data.employee.user_id).toBeNull();
    expect(res.body.data.user).toBeUndefined();

    // Verify in database that NO user record was created
    const userInDb = await User.findOne({ where: { email: 'david.miller@apexretail.com' } });
    expect(userInDb).toBeNull();
  });

  it('should view employee details', async () => {
    // 1. Create an employee
    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Claire Redfield',
        email: 'claire@apexretail.com',
        phone: '+1-555-777-8888',
        position: 'Security Lead',
        department: 'Facilities',
        salary_amount: 4200
      });
    expect(empRes.status).toBe(201);
    const empId = empRes.body.data.employee.id;

    // 2. Fetch employee details
    const res = await request(app)
      .get(`/api/employees/${empId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.employee.id).toBe(empId);
    expect(res.body.data.employee.first_name).toBe('Claire');
    expect(res.body.data.employee.last_name).toBe('Redfield');
    expect(res.body.data.employee.position).toBe('Security Lead');
    expect(res.body.data.employee.email).toBe('claire@apexretail.com');
  });

  it('should edit employee details', async () => {
    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Leon Kennedy',
        position: 'Patrol Officer',
        department: 'Security',
        base_salary: 3000
      });
    const empId = empRes.body.data.employee.id;

    const updateRes = await request(app)
      .put(`/api/employees/${empId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        position: 'Senior Security Consultant',
        base_salary: 3800,
        phone: '+1-555-999-0000'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.employee.position).toBe('Senior Security Consultant');
    expect(parseFloat(updateRes.body.data.employee.base_salary)).toBe(3800);
    expect(updateRes.body.data.employee.phone).toBe('+1-555-999-0000');
  });

  it('should deactivate an employee', async () => {
    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Jill Valentine',
        position: 'Tactical Advisor'
      });
    const empId = empRes.body.data.employee.id;

    const deactivateRes = await request(app)
      .patch(`/api/employees/${empId}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deactivateRes.status).toBe(200);
    expect(deactivateRes.body.data.employee.status).toBe('TERMINATED');

    // Also check GET reflects status
    const getRes = await request(app)
      .get(`/api/employees/${empId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.body.data.employee.status).toBe('TERMINATED');
  });

  it('should block unauthorized staff from managing employees (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'Unauthorized Hire',
        email: 'unauth@apexretail.com'
      });
    expect(res.status).toBe(403);
  });

  it('should record attendance and prevent duplicate records for the same employee and date', async () => {
    // 1. Create an employee
    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Alice Cooper',
        email: 'alice.cooper@apexretail.com',
        password: 'Password@123'
      });
    const employee = empRes.body.data.employee;

    const testDate = '2026-05-10';

    // 2. Record first attendance
    const att1 = await request(app)
      .post(`/api/employees/${employee.id}/attendance`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        date: testDate,
        status: 'PRESENT',
        check_in_time: '09:00:00',
        check_out_time: '17:00:00'
      });
    expect(att1.status).toBe(201);
    expect(att1.body.data.attendance.status).toBe('PRESENT');

    // 3. Attempt duplicate attendance on same date
    const attDuplicate = await request(app)
      .post(`/api/employees/${employee.id}/attendance`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        date: testDate,
        status: 'HALF_DAY'
      });
    expect(attDuplicate.status).toBe(409);
    expect(attDuplicate.body.error.code).toBe('DUPLICATE_ATTENDANCE');
  });

  it('should record monthly salary and prevent duplicate payroll for same period', async () => {
    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Robert Plant',
        email: 'robert.plant@apexretail.com',
        password: 'Password@123',
        base_salary: 4000
      });
    const employee = empRes.body.data.employee;

    // 1. Record salary for May 2026
    const salRes = await request(app)
      .post(`/api/employees/${employee.id}/salary`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        month: 5,
        year: 2026,
        base_amount: 4000,
        bonus_amount: 500,
        deductions: 200,
        payment_method: 'BANK_TRANSFER'
      });

    expect(salRes.status).toBe(201);
    // Net: 4000 + 500 - 200 = 4300
    expect(parseFloat(salRes.body.data.salary.net_amount)).toBe(4300);
    expect(salRes.body.data.salary.payment_status).toBe('PAID');

    // 2. Reject duplicate salary for May 2026
    const dupSal = await request(app)
      .post(`/api/employees/${employee.id}/salary`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        month: 5,
        year: 2026,
        base_amount: 4000
      });
    expect(dupSal.status).toBe(409);
    expect(dupSal.body.error.code).toBe('DUPLICATE_SALARY');
  });

  it('should enforce multi-tenant isolation on employee profiles and attendance', async () => {
    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Apex Protected Staff',
        email: 'protected.staff@apexretail.com',
        password: 'Password@123'
      });
    const employee = empRes.body.data.employee;

    // Business 2 tries to access Business 1 employee
    const getRes = await request(app)
      .get(`/api/employees/${employee.id}`)
      .set('Authorization', `Bearer ${biz2Token}`);
    expect(getRes.status).toBe(404);

    // Business 2 tries to record attendance on Business 1 employee
    const attRes = await request(app)
      .post(`/api/employees/${employee.id}/attendance`)
      .set('Authorization', `Bearer ${biz2Token}`)
      .send({ status: 'PRESENT' });
    expect(attRes.status).toBe(404);
  });
});
