import { beforeAll, afterAll } from 'vitest';
import { runMigrations } from '../src/database/migrate.js';
import { seedDatabase } from '../src/database/seed.js';
import { sequelize } from '../src/database/connection.js';

beforeAll(async () => {
  // Ensure we are in test mode and connected to businessflow_test
  process.env.NODE_ENV = 'test';
  
  // Run all migrations on test DB
  await runMigrations('up');

  // Clean test tables to ensure idempotent test runs
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
  const tables = [
    'supplier_payments', 'purchase_items', 'purchases', 'suppliers',
    'audit_logs', 'salaries', 'attendance', 'employees', 'expenses',
    'refund_items', 'refunds', 'payments', 'sale_items', 'sales',
    'customers', 'stock_movements', 'products', 'categories', 'users', 'businesses'
  ];
  for (const table of tables) {
    await sequelize.query(`TRUNCATE TABLE \`${table}\`;`).catch(() => {});
  }
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

  // Seed baseline test dataset
  await seedDatabase();
});

afterAll(async () => {
  await sequelize.close();
});
