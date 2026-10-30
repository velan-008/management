# BUSINESSFLOW — Full-Stack Business Management System

A production-grade, enterprise-ready Business Management System engineered for small-to-medium businesses, retail shops, and agencies.

---

## 1. Quick Setup & Execution Guide

### Prerequisites
- **Node.js**: `>= 18.0.0 LTS` (Tested on Node v26)
- **MySQL Server**: `>= 8.0` with InnoDB engine

### Database Setup
1. Create the development and test databases in MySQL:
```sql
CREATE DATABASE IF NOT EXISTS businessflow_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS businessflow_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Copy the environment configuration template:
```bash
cd server
cp .env.example .env
```
Ensure `.env` contains your MySQL credentials and a secure `JWT_SECRET`:
```env
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:5173

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=businessflow_dev
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_TEST_NAME=businessflow_test

JWT_SECRET=super_secret_jwt_businessflow_dev_key_2026_x99!
JWT_EXPIRES_IN=8h
```

### Installation, Migrations & Seeding
In the `server/` directory:
```bash
# 1. Install dependencies
npm install

# 2. Run Sequelize database migrations (Creates all 16 relational tables)
npm run db:migrate

# 3. Seed initial development and multi-tenant test data
npm run db:seed

# 4. Start backend development server (with hot reload via nodemon)
npm run dev

# 5. Run full automated backend test suite (via Vitest & Supertest)
npm test
```

### Client Frontend Setup
In the `client/` directory:
```bash
# 1. Install dependencies
npm install

# 2. Run automated frontend component & integration test suite
npm test

# 3. Build production bundle
npm run build

# 4. Start Vite frontend development server (proxies /api to http://localhost:5000)
npm run dev
```

---

## 2. Seed Credentials (Development & Testing)

| Business Tenant | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Apex Retail Solutions** (Tenant #1) | `ADMIN` | `admin@apexretail.com` | `Admin@123456` |
| **Apex Retail Solutions** (Tenant #1) | `STAFF` | `staff@apexretail.com` | `Staff@123456` |
| **Nova Digital Agency** (Tenant #2) | `ADMIN` | `admin@novaagency.com` | `Admin@123456` |

---

## 3. Implemented Stage 2 & Stage 4 Endpoints

### Authentication & Tenant Scoping (`/api/auth`)
- `POST /api/auth/login`: Authenticate and obtain JWT token.
- `GET /api/auth/me`: Fetch authenticated profile & business organization context.
- `POST /api/auth/register`: Onboard new organization with administrator account.
- `POST /api/auth/logout`: Revoke active session.

### Product Catalog (`/api/products`)
- `GET /api/products`: Paginated product catalog with search (`name`, `sku`, `barcode`), category filter (`category_id`), and stock status (`in_stock`, `low_stock`, `out_of_stock`).
- `GET /api/products/:id`: Fetch single product by ID (scoped strictly to user's business tenant).
- `POST /api/products`: Create product. Validates unique SKU/barcode within tenant and positive prices. If initial `quantity > 0`, automatically logs an immutable opening stock entry to `stock_movements`.
- `PUT /api/products/:id`: Update product attributes (name, SKU, barcode, category, prices, tax rate, threshold). **Protects inventory integrity by blocking direct modifications to `quantity`**.
- `POST /api/products/:id/adjust-stock`: Atomic stock adjustment. Employs `SELECT ... FOR UPDATE` row locking, verifies non-negative resulting stock, increments/decrements quantity, and writes an audit entry to `stock_movements` in a single transaction.
- `GET /api/products/:id/movements`: Per-product stock movement audit history.
- `GET /api/products/movements/all`: Global stock ledger across all products for the authenticated tenant.
- `DELETE /api/products/:id`: Safe soft deactivation (`is_active = false`), preserving historical sales records and stock movement audit trails.

### Category Management (`/api/categories`)
- `GET /api/categories`: Returns categories with real-time active product count subquery.
- `GET /api/categories/:id`: Fetch single category.
- `POST /api/categories`: Create category with unique name enforcement per tenant.
- `PUT /api/categories/:id`: Update category name or description.
- `DELETE /api/categories/:id`: Safe deletion. Safely updates referencing products (`category_id = NULL`) in a transaction to prevent data loss before removing the category record.

### Reports & Dashboard (`/api/reports`)
### Sales, Billing & POS (`/api/sales`)
- `POST /api/sales`: Atomic sale creation with `FOR UPDATE` row locking, intra/inter-state GST calculation (CGST/SGST/IGST), idempotency protection, payment logging, and stock deduction.
- `GET /api/sales`: Paginated sales invoice list with date range, customer, and payment status filters.
- `GET /api/sales/:id`: Detailed invoice view with tax breakdown and payment history.
- `POST /api/sales/:id/payments`: Record partial or full payments.
- `POST /api/sales/:id/refunds`: Safe returns/refunds with restocking options.

### Customer Management (`/api/customers`)
- `GET /api/customers`: Customer directory with live account balances.
- `POST /api/customers`: Create customer with tenant-scoped unique phone validation.
- `GET /api/customers/:id`: Customer detail with purchase history.
- `PUT /api/customers/:id`: Update customer details.
- `DELETE /api/customers/:id`: Safe deactivation preventing deletion of customers with transaction history.

### Employees, Attendance & Payroll (`/api/employees`, `/api/attendance`, `/api/salaries`)
- `GET /api/employees`: Staff directory.
- `POST /api/employees`: Create employee and provision login credentials (Admin only).
- `POST /api/attendance`: Record daily attendance with daily duplicate prevention.
- `GET /api/attendance`: Filter attendance by date or month.
- `POST /api/salaries`: Generate monthly payroll record with period duplicate prevention.
- `GET /api/salaries`: View salary payment history.

### Expenses & Reports (`/api/expenses`, `/api/reports`)
- `GET /api/expenses`: Expense ledger with category and date filtering.
- `POST /api/expenses`: Record business operational expense.
- `GET /api/reports/dashboard`: Live KPI metrics (revenue, gross profit, net profit, low stock count).
- `GET /api/reports/profit-loss`: Detailed income statement with COGS, gross margin, and OPEX.
- `GET /api/reports/inventory-valuation`: Cost and retail inventory valuation.
- `GET /api/reports/export/sales`: Sanitized CSV export of sales invoices.
- `GET /api/reports/export/inventory`: Sanitized CSV export of inventory.

### Business Settings (`/api/businesses/me`)
- `GET /api/businesses/me`: Fetch business profile, GST tax configuration, and currency.
- `PUT /api/businesses/me`: Update profile, state, GSTIN, and currency (Admin only).

---

## 4. Financial & Inventory Concurrency Strategy

1. **Pessimistic Row Locking**:
   - `SELECT ... FOR UPDATE` acquires exclusive row locks on `products` sorted numerically by `id ASC` during stock adjustments and checkout to prevent concurrent overselling and eliminate deadlocks.
2. **ACID Transaction Boundaries**:
   - Creating initial stock, adjusting quantities, checkout sales, and writing `stock_movements` records execute within a single atomic `sequelize.transaction`.
3. **Database-Level Constraint**:
   - Installed `CONSTRAINT chk_products_quantity_non_negative CHECK (quantity >= 0)` on the MySQL `products` table ensures the database engine rejects any operation resulting in negative stock.
4. **Permanent Audit Trail**:
   - Stock quantities can never be mutated without an immutable record in `stock_movements` storing previous quantity, new quantity, movement type (`PURCHASE`, `SALE`, `RETURN`, `DAMAGE`, `ADJUSTMENT`), timestamp, and user ID.
5. **Decimal Precision & Security**:
   - High-precision monetary arithmetic using `decimal.js` prevents IEEE-754 floating-point drift.
   - CSV formula injection protection prepends `'` to cells beginning with `=`, `+`, `-`, or `@`.

---

## 5. Automated Test Suite Results

### A. Backend Test Suite (`server/`)
Executed via `npm test` using Vitest and Supertest against MySQL `businessflow_test`:
```
 ✓ tests/auth.test.js (15 tests passed)
 ✓ tests/product.test.js (19 tests passed)
 ✓ tests/sale.test.js (7 tests passed)
 ✓ tests/customer.test.js (5 tests passed)
 ✓ tests/employee_hr.test.js (5 tests passed)
 ✓ tests/expense_report.test.js (5 tests passed)
 ✓ tests/report.test.js (4 tests passed)

 Test Files  7 passed (7)
      Tests  60 passed (60)
```

### B. Frontend Test Suite (`client/`)
Executed via `npm test -- --run` using Vitest and React Testing Library:
```
 ✓ src/test/auth-and-dashboard.test.jsx (16 tests passed)
 ✓ src/test/inventory.test.jsx (7 tests passed)
 ✓ src/test/sales-and-operations.test.jsx (6 tests passed)

 Test Files  3 passed (3)
      Tests  29 passed (29)
```

### C. Client Production Build
Executed via `npm run build`:
```
✓ 2461 modules transformed.
dist/index.html                   1.02 kB │ gzip:   0.57 kB
dist/assets/index-Cc2gSEgu.css   33.28 kB │ gzip:   6.09 kB
dist/assets/index-YuvIGJf7.js   787.36 kB │ gzip: 216.88 kB
✓ built in 6.87s
```

---

## 6. Project Documentation
- [Architecture](file:///e:/mangement/docs/ARCHITECTURE.md)
- [Database Schema](file:///e:/mangement/docs/DATABASE_SCHEMA.md)
- [API Specification](file:///e:/mangement/docs/API_SPECIFICATION.md)
- [Testing Guide](file:///e:/mangement/docs/TESTING.md)
- [Deployment Guide](file:///e:/mangement/docs/DEPLOYMENT.md)
- [Security Guide](file:///e:/mangement/docs/SECURITY.md)
- [User Guide](file:///e:/mangement/docs/USER_GUIDE.md)
- [Implementation Status](file:///e:/mangement/docs/IMPLEMENTATION_STATUS.md)
#   m a n a g e m e n t  
 