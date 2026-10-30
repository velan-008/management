import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { jwtConfig } from '../src/config/jwt.config.js';
import './setup.js';

describe('BUSINESSFLOW — Stage 2 Foundation & Authentication Tests', () => {
  let adminToken = '';
  let staffToken = '';

  // 1. Database Connection & Health
  describe('GET /api/health', () => {
    it('should return 200 OK with database UP status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('OK');
      expect(res.body.data.database).toBe('UP');
      expect(res.body.data.timestamp).toBeDefined();
    });
  });

  // 2. Authentication: Login
  describe('POST /api/auth/login', () => {
    it('should authenticate Admin user and return JWT with safe user object', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@apexretail.com',
          password: 'Admin@123456'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('admin@apexretail.com');
      expect(res.body.data.user.role).toBe('ADMIN');

      // CRITICAL SECURITY: Password hash must NEVER appear in API response
      expect(res.body.data.user.password_hash).toBeUndefined();
      expect(res.body.data.user.password).toBeUndefined();

      adminToken = res.body.data.token;
    });

    it('should authenticate Staff user and issue valid JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'staff@apexretail.com',
          password: 'Staff@123456'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('STAFF');
      expect(res.body.data.user.password_hash).toBeUndefined();

      staffToken = res.body.data.token;
    });

    it('should reject login with incorrect password (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@apexretail.com',
          password: 'WrongPassword999!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.data).toBeUndefined();
    });

    it('should reject login for non-existent email (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@nowhere.com',
          password: 'SomePassword123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with missing or invalid credentials (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toBeInstanceOf(Array);
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });
  });

  // 3. Protected Endpoint & Token Validation
  describe('GET /api/auth/me', () => {
    it('should return current user profile and business scope when valid token is provided', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin@apexretail.com');
      expect(res.body.data.business.name).toBe('Apex Retail Solutions');
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it('should reject requests with missing token (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with invalid signature token (401 Unauthorized)', async () => {
      const forgedToken = jwt.sign(
        { id: 1, business_id: 1, role: 'ADMIN' },
        'wrong_attacker_secret_key'
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject requests with expired token (401 Unauthorized)', async () => {
      const expiredToken = jwt.sign(
        { id: 1, business_id: 1, role: 'ADMIN' },
        jwtConfig.secret,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  // 4. Role-Based Access Control (Admin vs Staff)
  describe('Role-Based Authorization on Protected Routes', () => {
    it('should grant access to Admin user on admin-only route', async () => {
      const res = await request(app)
        .get('/api/admin/verify-access')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('ADMIN');
    });

    it('should reject Staff user on admin-only route (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/verify-access')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ACCESS');
    });
  });

  // 5. Public Registration & Privilege Escalation Prevention
  describe('POST /api/auth/register', () => {
    it('should allow public registration of a brand-new business entity and its admin', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          businessName: 'Vertex Logistics',
          businessEmail: 'contact@vertexlogistics.com',
          name: 'Marcus Vance',
          email: 'marcus@vertexlogistics.com',
          password: 'Password@2026',
          state: 'Texas',
          currencyCode: 'USD',
          currencySymbol: '$'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.user.business.name).toBe('Vertex Logistics');
      // Verify isolation: new business ID must be distinct
      expect(res.body.data.user.business.id).toBeGreaterThan(2);
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it('should reject registration attempts with weak passwords (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          businessName: 'Weak Password Inc',
          businessEmail: 'test@weak.com',
          name: 'Weak User',
          email: 'weak@weak.com',
          password: 'weak'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // 6. Cross-Business Data Access & Tenant Isolation
  describe('Cross-Business Data Isolation Verification', () => {
    it('should guarantee that users from different businesses belong to distinct tenant scopes', async () => {
      // Login as Nova Agency Admin (Business 2)
      const novaLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@novaagency.com',
          password: 'Admin@123456'
        });

      expect(novaLogin.status).toBe(200);
      const novaToken = novaLogin.body.data.token;

      // Verify Nova profile belongs to Business 2
      const novaProfile = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${novaToken}`);

      expect(novaProfile.body.data.business.name).toBe('Nova Digital Agency');
      expect(novaProfile.body.data.business.id).not.toBe(1);

      // Verify Apex profile belongs to Business 1
      const apexProfile = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(apexProfile.body.data.business.name).toBe('Apex Retail Solutions');
      expect(apexProfile.body.data.business.id).toBe(1);

      // Both tenant IDs are completely isolated
      expect(novaProfile.body.data.business.id).not.toEqual(apexProfile.body.data.business.id);
    });
  });

  // 7. Logout Endpoint
  describe('POST /api/auth/logout', () => {
    it('should return 200 OK when logging out', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.loggedOut).toBe(true);
    });
  });
});
