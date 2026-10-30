# BUSINESSFLOW — System Architecture & Specification

## 1. Executive Summary & System Overview

**BUSINESSFLOW** is an enterprise-grade, multi-role Business Management System engineered for small-to-medium businesses (SMBs), retail stores, and service agencies. It unifies Point-of-Sale (POS), inventory tracking, double-entry-aligned accounting metrics, human resource tracking, customer CRM, and business intelligence reporting into a single cohesive platform.

### Core Architectural Principles
1. **Zero-Trust Financial Calculations**: The client interface is treated as untrusted presentation only. All pricing, tax rates (GST CGST/SGST/IGST), line-item extensions, discounts, taxable amounts, and totals are computed strictly on the Node.js/Express backend inside transactional boundaries.
2. **ACID Concurrency & Inventory Row Locking**: Inventory decrements, stock movement audit trails, invoice creation, and payment allocations execute atomically using Sequelize managed database transactions (`sequelize.transaction`). Concurrent sales utilize deterministic row-level locks (`SELECT ... FOR UPDATE` with `ORDER BY id ASC`) to eliminate race conditions, overselling, and deadlocks.
3. **Strict Multi-Tenant Isolation**: Built with an explicit `business_id` (organization identifier) on all tenant-specific tables and foreign keys. Every query enforces tenant scoping; cross-business access attempts return `404 Not Found` to prevent data and identifier leakage.
4. **Immutable History & Formal Refund Workflow**: Once finalized (`COMPLETED`), sales and payments are immutable legal documents. Modifications occur strictly through explicit, auditable `refunds` and `refund_items` with optional inventory restocking and customer ledger adjustments.
5. **Role-Based Access Control (RBAC)**: Strict separation between `Admin` and `Staff` roles enforced via backend middleware. Public self-registration only ever assigns standard permissions; only established Admins can provision staff accounts or adjust privilege scopes.

---

## 2. Technology Stack & Runtime Specifications

| Layer | Technology | Version / Specification | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React.js | `^18.3.1` (Vite `^5.4.0`) | Fast Single-Page Application (SPA) with ESM fast-refresh |
| **Styling & Theme** | Tailwind CSS | `^3.4.10` | Utility-first design system with CSS custom properties for Light/Dark mode |
| **Routing** | React Router DOM | `^6.26.0` | Client-side routing, protected route wrappers, auth guards |
| **HTTP Client** | Axios | `^1.7.0` | Intercepted HTTP requests, automatic JWT bearer attachment, refresh handling |
| **Visualizations** | Recharts | `^2.12.7` | Sales performance trends, inventory distribution, revenue vs expense curves |
| **Icons** | Lucide React | `^0.440.0` | Clean, modern iconography |
| **Backend Runtime** | Node.js | `>= 18.0.0 LTS` | Event-driven server runtime |
| **Server Framework** | Express.js | `^4.19.2` | RESTful API routing, rate limiting, security middleware |
| **ORM / Database Layer**| Sequelize | `^6.37.3` with `mysql2 ^3.11.0` | Object-Relational Mapping, migrations, transactions, validation |
| **Database** | MySQL | `>= 8.0` (InnoDB engine) | Relational storage, ACID compliance, row locking, CHECK constraints |
| **Authentication** | JWT (`jsonwebtoken`) | `^9.0.2` | Signed bearer tokens, configurable expiration (e.g. 8h access token) |
| **Password Security** | `bcryptjs` | `^2.4.3` | Cost factor 12 salt hashing |
| **Validation** | Joi / Express-Validator | `^17.13.0` | Strict server-side schema verification for all payloads |
| **PDF Generation** | PDFKit / Puppeteer | `^0.15.0` | Server-rendered tax invoices with printable layout |

---

## 3. Financial, Tax & Accounting Computation Standards

To avoid ambiguity between financial reporting and cash flows, BUSINESSFLOW enforces standardized accounting formulas with exact commercial rounding (Half-Up to 2 decimal places: `round2(x) = Math.round(x * 100) / 100`).

### A. Invoice Calculation & Rounding Pipeline (Server-Side)

```
Step 1: For each item i in Invoice:
  gross_amount[i]        = round2(quantity[i] * unit_selling_price[i])
  
  // Line-level discount (percentage or direct amount)
  If discount_percentage[i] > 0:
    line_discount[i]     = round2(gross_amount[i] * (discount_percentage[i] / 100))
  Else:
    line_discount[i]     = round2(discount_amount[i] || 0.00)
    
  taxable_amount[i]      = gross_amount[i] - line_discount[i]

  // GST Determination based on Business State vs Customer State:
  If customer_state is null OR customer_state == business_state (Intra-State):
    cgst_rate[i]         = tax_rate[i] / 2
    sgst_rate[i]         = tax_rate[i] / 2
    cgst_amount[i]       = round2(taxable_amount[i] * (cgst_rate[i] / 100))
    sgst_amount[i]       = round2(taxable_amount[i] * (sgst_rate[i] / 100))
    igst_rate[i]         = 0.00
    igst_amount[i]       = 0.00
  Else (Inter-State):
    cgst_rate[i]         = 0.00
    cgst_amount[i]       = 0.00
    sgst_rate[i]         = 0.00
    sgst_amount[i]       = 0.00
    igst_rate[i]         = tax_rate[i]
    igst_amount[i]       = round2(taxable_amount[i] * (igst_rate[i] / 100))

  tax_amount[i]          = cgst_amount[i] + sgst_amount[i] + igst_amount[i]
  line_total[i]          = taxable_amount[i] + tax_amount[i]

Step 2: Invoice Totals Aggregation:
  subtotal               = sum(taxable_amount[i])
  cgst_total             = sum(cgst_amount[i])
  sgst_total             = sum(sgst_amount[i])
  igst_total             = sum(igst_amount[i])
  tax_total              = cgst_total + sgst_total + igst_total
  
  // Invoice-level order discount (applied post-line extensions)
  raw_total              = subtotal + tax_total - order_discount
  
  // Commercial Round-Off:
  grand_total            = round2(raw_total)
  round_off              = round2(grand_total - raw_total)  // (typically 0.00 or fractional cent)
  
Step 3: Payments & Balance Due:
  paid_amount            = sum(payments applied during checkout)
  balance_due            = max(0.00, round2(grand_total - paid_amount))
  payment_status         = (paid_amount == 0) ? 'UNPAID' : (paid_amount >= grand_total ? 'PAID' : 'PARTIALLY_PAID')
```

---

## 4. Concurrency & Stock Integrity Architecture

### The Concurrency Problem
When multiple cashiers or orders hit the server simultaneously for low-stock inventory, naive `SELECT` followed by `UPDATE` allows race conditions (overselling), causing stock to plunge below zero.

### Solution: Deterministic Pessimistic Row Locking
1. **Pessimistic Locking (`FOR UPDATE`)**: During sale creation, product rows are locked exclusively within an active InnoDB transaction:
   ```sql
   SELECT id, business_id, quantity, cost_price, selling_price, tax_rate, is_active
   FROM products
   WHERE id IN (:sortedProductIds) AND business_id = :businessId
   ORDER BY id ASC
   FOR UPDATE;
   ```
2. **Deadlock Elimination**: By sorting product IDs numerically in ascending order (`ORDER BY id ASC`), all concurrent transactions acquire row locks in the exact same sequence, mathematically preventing circular wait conditions (deadlocks).
3. **Pre-Deduction Validation**:
   - If any `product.quantity < requested_quantity`, the transaction rolls back immediately and aborts with HTTP `400 Bad Request` and error code `INSUFFICIENT_STOCK`.
   - If any product `is_active == false`, the sale aborts with `PRODUCT_INACTIVE`.
4. **Database-Level Constraint**:
   - A MySQL Check Constraint `CONSTRAINT chk_products_quantity_non_negative CHECK (quantity >= 0)` is installed directly on the table as a hard fail-safe.
5. **Stock Movement Ledger**:
   - For every decremented item, a `stock_movements` record is created inside the same transaction with `type = 'SALE'`, linking the sale `reference_id = invoice_number`.

---

## 5. Refund & Payment History Preservation Workflow

Legal and statutory accounting standards dictate that completed tax invoices and captured payments must **never be deleted or altered**.

### Refund Lifecycle
1. **Original Invoice & Payment Retention**: The original invoice and its original `payments` records remain untouched in the database as permanent proof of the initial transaction.
2. **Refund Creation**:
   - Authorized Admins/Staff issue a refund against a sale via `POST /api/sales/:id/refund`.
   - A distinct record is inserted into `refunds` with a unique `refund_number` (e.g. `REF-2026-0001`).
   - Line items being returned are inserted into `refund_items` with their snapshot price, refunded tax, and a `restock` boolean flag.
3. **Inventory Restocking**:
   - If `restock == true`: Item quantity is added back to `products.quantity`, and a `stock_movements` record is logged with `type = 'RETURN'`.
   - If `restock == false` (e.g. damaged goods): Product quantity is not increased, and a `stock_movements` record is logged with `type = 'DAMAGE'` for loss auditing.
4. **Sale Status Progression**:
   - `sales.refunded_amount` is incremented.
   - If `refunded_amount >= sales.grand_total`: `sales.status` updates to `'REFUNDED'`.
   - If `refunded_amount < sales.grand_total`: `sales.status` updates to `'PARTIALLY_REFUNDED'`.

---

## 6. Customer Outstanding Balances & Financial Reconciliation

### A. Customer Accounts Receivable (A/R) Rules
- **Invoice Issuance**: When a sale is created with `balance_due > 0`, the customer's `outstanding_balance` is incremented:
  $$\text{customer.outstanding\_balance} \mathrel{+}= \text{sale.balance\_due}$$
- **Payment Collection**: When a payment is recorded against an invoice:
  $$\text{customer.outstanding\_balance} \mathrel{-}= \text{payment.amount}$$
  $$\text{sale.paid\_amount} \mathrel{+}= \text{payment.amount}$$
  $$\text{sale.balance\_due} \mathrel{-}= \text{payment.amount}$$
- **Refunds Processing**:
  - If the original invoice had an unpaid balance:
    $$\text{sale.balance\_due} \mathrel{-}= \text{refund.total\_refunded}$$
    $$\text{customer.outstanding\_balance} \mathrel{-}= \text{refund.total\_refunded}$$
  - If the refund is refunded as **Store Credit**:
    $$\text{customer.store\_credit} \mathrel{+}= \text{refund.total\_refunded}$$
  - If the refund is paid out via **Cash / Bank Transfer**:
    - The company disburses physical cash; the customer's balance due remains zero.
- **Drift Prevention (Reconciliation Guarantee)**:
  At any point in time, the system guarantees and provides an automated reconciliation check:
  $$\text{customer.outstanding\_balance} \equiv \sum_{\substack{\text{sales } s \\ \text{status } \neq \text{'CANCELLED'}}} s.\text{balance\_due} - \text{unallocated\_credits}$$

### B. Business Profit & Loss Calculations with Refund Adjustments
- **Gross Sales**: Total taxable invoice amount billed during period.
- **Sales Returns / Refunds**: Total taxable amount refunded across `refund_items` during period.
- **Net Sales**:
  $$\text{Net Sales} = \text{Gross Sales} - \text{Discounts} - \text{Sales Returns}$$
- **Adjusted Cost of Goods Sold (COGS)**:
  $$\text{COGS} = \sum(\text{Units Sold} \times \text{Unit Cost Price}) - \sum_{\text{restocked}}(\text{Units Returned} \times \text{Unit Cost Price})$$
- **Gross Profit**:
  $$\text{Gross Profit} = \text{Net Sales} - \text{COGS}$$
- **Operating Expenses (OPEX)**:
  $$\text{OPEX} = \sum(\text{Operating Expenses}) + \sum(\text{Paid Employee Salaries})$$
- **Net Operating Profit**:
  $$\text{Net Operating Profit} = \text{Gross Profit} - \text{OPEX}$$
- **Tax Liability (Balance Sheet)**:
  $$\text{Net Tax Owed} = \text{Taxes Collected on Sales} - \text{Taxes Reversed on Refunds}$$

---

## 7. Security & Multi-Tenant Isolation Architecture

1. **Multi-Tenant Scoping**:
   - Every tenant-owned table features a `business_id` foreign key referencing `businesses(id)` with `ON DELETE CASCADE`.
   - All database queries across models and repositories strictly filter with `{ where: { business_id: req.user.business_id } }`.
   - Attempting to access an object (e.g. `/api/sales/105`) that exists in the database but belongs to a different business immediately returns `404 Not Found`.
2. **JWT Lifecycle & RBAC**:
   - Access tokens sign `{ id, business_id, role, email }`.
   - Endpoints requiring administrative powers (Staff management, Salary edits, Product deactivations, Category deletions, P&L reports) enforce `requireRole(['ADMIN'])`.
3. **Defense in Depth**:
   - `express-rate-limit`: Brute force protection on `/api/auth/login` (5 attempts / 15 minutes).
   - `helmet`: Secure HTTP headers (CSP, HSTS, Sniff-protection).
   - `cors`: Strict origin whitelisting.
   - Sequelize parameter binding: Prevents SQL injection across all queries.
