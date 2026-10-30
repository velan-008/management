# BUSINESSFLOW — Security & Tenant Isolation Architecture

This document describes the security controls, authentication patterns, tenant isolation guarantees, and defensive programming practices implemented in BUSINESSFLOW.

---

## 1. Multi-Tenant Data Isolation

BUSINESSFLOW is architected from the ground up for strict multi-tenant isolation. A single database instance serves multiple distinct businesses without data leakage.

### Architecture Rules
1. **Server-Derived Tenant Scope**:
   - The user's `business_id` is extracted strictly from the validated JWT token (`req.user.business_id`).
   - The server **never trusts client-supplied tenant identifiers** in route parameters, query strings, or body payloads.
2. **Mandatory Tenant Scoping in ORM Queries**:
   - All Sequelize queries explicitly specify `where: { business_id: req.user.business_id, ... }`.
   - Any attempt to query, update, or delete a record belonging to another business results in `404 Not Found` rather than `403 Forbidden`, preventing resource enumeration attacks.
3. **Compound Foreign Keys & Indexes**:
   - Uniqueness constraints are composite (`business_id`, `sku`), (`business_id`, `phone`), and (`business_id`, `invoice_number`).
   - This ensures multiple independent businesses can have products with the same SKU (e.g. standard barcodes) and customers with identical phone numbers without collision.

---

## 2. Authentication & Session Management

- **Password Hashing**: Passwords are saved with `bcryptjs` using a cost factor of 12 (salt rounds). Plaintext passwords are never stored or logged.
- **JWT Tokens**:
  - Signed with HMAC-SHA256 using a high-entropy secret (`JWT_SECRET`).
  - Contains minimal claims: `userId`, `businessId`, `role`.
  - Configurable expiration (default `24h`).
- **Authorization & RBAC**:
  - Two primary roles: `ADMIN` and `STAFF`.
  - Sensitive operations (changing business settings, deleting categories, accessing P&L income reports, managing employee payroll, issuing refunds) strictly require `ADMIN` authorization.
  - Staff users are restricted to operational tasks (POS cashiering, viewing product catalog, marking attendance, recording operational expenses).

---

## 3. Financial Integrity & Concurrency Control

- **Row-Level Locking on Checkout**:
  - During checkout, inventory rows are locked using `SELECT ... FOR UPDATE` within an explicit Sequelize database transaction (`sequelize.transaction`).
  - Stock is re-verified inside the transaction. If available stock is insufficient, the transaction rolls back cleanly, returning `INSUFFICIENT_STOCK`.
- **Arbitrary Precision Mathematics**:
  - Floating-point arithmetic errors are eliminated by computing all subtotals, tax rates, GST splits, and grand totals using `decimal.js`.
  - Values are rounded to 2 decimal places using half-up rounding.
- **Idempotency Protection**:
  - The POS checkout accepts an `idempotency_key` (UUID or client-generated unique string).
  - If a network retry or accidental double-click submits the same key, the existing sale is returned without creating duplicate charges or double-deducting inventory.
- **Immutable Transaction Records**:
  - `Sale`, `SaleItem`, `Payment`, and `StockMovement` records are treated as immutable ledgers.
  - Returns and cancellations generate explicit refund and reverse stock movement records instead of destructively mutating or deleting completed sales.

---

## 4. Input Validation & Injection Prevention

- **Zod Schema Validation**:
  - All incoming HTTP request bodies, query parameters, and route parameters are validated using Zod schemas (`src/middleware/validate.middleware.js`).
  - Unknown fields are stripped to prevent mass-assignment attacks.
- **SQL Injection Prevention**:
  - Standard Sequelize parameterized queries and object syntax prevent raw SQL injection vulnerabilities.
- **CSV Formula Injection Sanitization**:
  - In exported CSV spreadsheets (`/api/reports/export/sales`, `/api/reports/export/inventory`), all text cells starting with formula symbols (`=`, `+`, `-`, `@`) are prepended with a single quote (`'`). This prevents Excel/Sheets from executing arbitrary formulas or external macros.
- **XSS & HTTP Headers**:
  - Helmet (`helmet`) sets secure HTTP response headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`).
  - CORS is restricted to explicit trusted origins (`CORS_ORIGIN`).
  - Rate limiting protects authentication and sensitive endpoints from brute-force attempts.
