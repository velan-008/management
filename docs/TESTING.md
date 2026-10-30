# BUSINESSFLOW — Comprehensive Testing Guide & Verification Report

This document outlines the testing architecture, test suites, execution commands, and verified results across both the backend server and frontend client.

---

## 1. Test Architecture Overview

- **Backend Testing Framework**: Vitest with Supertest against an active MySQL test database (`businessflow_test`).
- **Frontend Testing Framework**: Vitest with `@testing-library/react` and `jsdom`.
- **Database Isolation Strategy**:
  - Each backend test run dynamically executes database migrations and seeds baseline test fixtures.
  - Test suites utilize dedicated mock/isolated tenants (e.g. `business_id: 1` for Apex Retail, `business_id: 2` for Nexus Global) to explicitly verify multi-tenant isolation.
  - Transactions ensure rollback and clean teardown between destructive test cases.

---

## 2. Test Execution Commands

### Backend Tests
From the `server/` directory:
```bash
# Run all backend unit and integration tests
npm test

# Run a specific test suite
npx vitest run tests/sale.test.js
npx vitest run tests/customer.test.js
npx vitest run tests/employee_hr.test.js
npx vitest run tests/expense_report.test.js
npx vitest run tests/report.test.js
npx vitest run tests/product.test.js
npx vitest run tests/auth.test.js
```

### Frontend Tests
From the `client/` directory:
```bash
# Run all frontend component and integration tests
npm test -- --run

# Run client tests in watch mode
npm test

# Run production build validation
npm run build
```

---

## 3. Verified Backend Test Results

**Summary**: 7 test suites, 60 tests passed, 0 failures.

| Test File | Tests Passed | Covered Scenarios |
| :--- | :--- | :--- |
| `tests/auth.test.js` | 15 / 15 | Registration, login, JWT issuance, password hashing, RBAC permissions, weak password rejection, rate limiting, tenant token scoping |
| `tests/product.test.js` | 19 / 19 | Product CRUD, SKU uniqueness per tenant, low stock thresholding, category management, atomic stock adjustments, stock movement audit trail, cross-tenant isolation |
| `tests/sale.test.js` | 7 / 7 | Atomic checkout, inventory deduction with row locks (`FOR UPDATE`), intra-state CGST/SGST vs inter-state IGST calculation, idempotency duplicate prevention, partial/full payments, returns/refunds with stock restock, tenant scoping |
| `tests/customer.test.js` | 5 / 5 | Customer CRUD, per-tenant phone uniqueness, cross-tenant duplicate phone allowance, safe deletion prevention for customers with sales history, cross-tenant data isolation |
| `tests/employee_hr.test.js` | 5 / 5 | Employee creation, user credentials generation, Admin-only RBAC guards, attendance recording with daily duplicate rejection, monthly salary with period duplicate rejection, tenant isolation |
| `tests/expense_report.test.js` | 5 / 5 | Expense creation, categorization, P&L aggregation for custom date ranges, inventory valuation calculation, CSV formula injection sanitization, tenant isolation |
| `tests/report.test.js` | 4 / 4 | Real-time KPI summaries (revenue, gross profit, net profit, low stock items), Staff vs Admin dashboard access, tenant isolation on dashboard data |

---

## 4. Verified Frontend Test Results

**Summary**: 3 test suites, 29 tests passed, 0 failures.

| Test File | Tests Passed | Covered Scenarios |
| :--- | :--- | :--- |
| `src/test/auth-and-dashboard.test.jsx` | 16 / 16 | Login page validation & token storage, registration workflow, protected route redirects, layout components (Sidebar, Topbar), Design System components (Button, Modal, Table, Pagination) |
| `src/test/inventory.test.jsx` | 7 / 7 | InventoryPage master container, Product list tab, Category management tab, Stock Movement audit history tab, search & filter interactions, Add Product modal |
| `src/test/sales-and-operations.test.jsx` | 6 / 6 | POS checkout page with product search & cart addition, Invoices ledger with GST tax display and status badges, Customers page with create modal, Employees & HR page with staff cards, Expenses page with ledger and metrics, Reports page with KPI cards and CSV export actions |

---

## 5. Security & Edge Case Coverage

1. **Concurrent Overselling**:
   - Verified via `sale.controller.js` using database row-level locking (`SELECT ... FOR UPDATE`) within an active Sequelize transaction. If two cashiers attempt to sell the last unit simultaneously, the second transaction safely detects stock exhaustion and aborts with `INSUFFICIENT_STOCK`.
2. **Double-Click Idempotency**:
   - Submitting an invoice with a duplicate `idempotency_key` returns the existing invoice rather than creating duplicate orders or double-deducting stock.
3. **Decimal Floating-Point Drift**:
   - All financial math uses `decimal.js` with explicit 2-decimal half-up rounding. Taxes and line totals reconcile to exact penny increments.
4. **Tenant Isolation**:
   - Every read and write query enforces `where: { business_id: req.user.business_id }`. Direct object access attempts by one tenant to another's records strictly return `404 Not Found`.
5. **CSV Injection Protection**:
   - Cells beginning with formula triggers (`=`, `+`, `-`, `@`) are prepended with a single quote `'` in exported CSV files.
