# BUSINESSFLOW — REST API Specification

All endpoints are prefixed with `/api`. All requests and responses use JSON content type (`Content-Type: application/json`) unless requesting binary PDF output.

---

## 1. Universal Response Envelope Standards

### Success Response Envelope
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Requested 10 units of SKU-1002, but only 4 units are available in inventory.",
    "details": [
      {
        "field": "items[0].quantity",
        "issue": "Cannot exceed current in-stock quantity 4"
      }
    ]
  }
}
```

### Standard HTTP Status Codes
- `200 OK`: Successful retrieval or update.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Payload validation failure or business rule violation (e.g. insufficient stock, invalid discount).
- `401 Unauthorized`: Missing, expired, or invalid JWT token.
- `403 Forbidden`: Authenticated user lacks permission (e.g. Staff attempting Admin operations).
- `404 Not Found`: Resource does not exist or does not belong to the user's business tenant (Strict Tenant Isolation).
- `409 Conflict`: Unique constraint violation (e.g. duplicate SKU, duplicate email, duplicate attendance entry).
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Uncaught server exception.

---

## 2. API Endpoints Map

### A. Authentication & User Profile
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register initial Business and initial Admin user |
| `POST` | `/api/auth/login` | Public | Authenticate with email/password; returns JWT |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current session profile and business settings |
| `POST` | `/api/auth/logout` | Authenticated | Invalidate token session |

### B. Staff & User Administration (Admin Only)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | Admin | List all user accounts in business |
| `POST` | `/api/users` | Admin | Create new staff user account |
| `PUT` | `/api/users/:id` | Admin | Update user details, role, or active status |
| `DELETE` | `/api/users/:id` | Admin | Deactivate staff account |

### C. Categories
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/categories` | Authenticated | List all product categories |
| `POST` | `/api/categories` | Admin | Create new category |
| `PUT` | `/api/categories/:id` | Admin | Update category name / description |
| `DELETE` | `/api/categories/:id` | Admin | Delete category (re-associates products to NULL) |

### D. Inventory & Products
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Authenticated | List products with pagination, search, category filter, low-stock filter |
| `GET` | `/api/products/:id` | Authenticated | Retrieve single product details |
| `POST` | `/api/products` | Admin, Staff | Create a new product (validates unique SKU & Barcode) |
| `PUT` | `/api/products/:id` | Admin, Staff | Update product details and pricing |
| `DELETE` | `/api/products/:id` | Admin | Soft delete/deactivate (blocked if product has sales history) |
| `POST` | `/api/products/:id/adjust-stock`| Admin | Record manual stock adjustment with audit movement |
| `GET` | `/api/products/:id/movements` | Authenticated | Retrieve historical stock movement ledger for product |

### E. Sales, Invoicing & Billing
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/sales` | Authenticated | Create invoice with items and optional initial payment. Atomic ACID transaction with pessimistic row-locking (`FOR UPDATE`) on products. |
| `GET` | `/api/sales` | Authenticated | Paginated sales list with date filters, customer filter, payment status filter |
| `GET` | `/api/sales/:id` | Authenticated | Retrieve full invoice details with line items and payments |
| `POST` | `/api/sales/:id/payments` | Authenticated | Record payment towards an invoice balance (immutable history) |
| `POST` | `/api/sales/:id/refund` | Admin, Staff | Process refund (full or partial); logs `refunds`, `refund_items`, updates customer balance/store credit, restocks inventory |
| `GET` | `/api/sales/:id/refunds` | Authenticated | Retrieve refund history for specific sale |
| `GET` | `/api/sales/:id/pdf` | Authenticated | Download printable PDF tax invoice |

#### Detailed Endpoint: `POST /api/sales`
**Payload:**
```json
{
  "customer_id": 14,
  "order_discount": 5.00,
  "items": [
    {
      "product_id": 101,
      "quantity": 2,
      "discount_percentage": 10.0
    },
    {
      "product_id": 105,
      "quantity": 1,
      "discount_amount": 2.50
    }
  ],
  "payment": {
    "amount": 50.00,
    "payment_method": "UPI",
    "reference_number": "UPI-8849201"
  },
  "notes": "Delivered to reception"
}
```
**Concurrency & Transaction Processing:**
1. Sorts `product_id`s in ascending numerical order (`101, 105`) and executes `SELECT ... FOR UPDATE` row locks.
2. If any requested quantity exceeds `product.quantity`, transaction rolls back and returns `400 Bad Request` with code `INSUFFICIENT_STOCK`.
3. Server recalculates line gross, discounts, tax rates (CGST/SGST or IGST based on customer state), subtotal, order discount, round-off, and grand total.
4. Updates product quantities and logs `stock_movements`.
5. Creates `sales` and `sale_items`.
6. Inserts `payments` record if `payment.amount > 0`.
7. Updates customer `outstanding_balance += sale.balance_due`.

---

#### Detailed Endpoint: `POST /api/sales/:id/refund`
**Payload:**
```json
{
  "refund_method": "STORE_CREDIT",
  "reason": "Wrong size ordered by customer",
  "notes": "Tags intact, item in perfect condition",
  "items": [
    {
      "sale_item_id": 84,
      "quantity": 1,
      "restock": true
    }
  ]
}
```
**Refund Processing Logic:**
1. Verifies sale belongs to `req.user.business_id`.
2. Verifies `quantity <= (sale_item.quantity - sale_item.refunded_quantity)`.
3. Computes refundable line subtotal and reversed tax proportion.
4. If `restock == true`, increments `products.quantity` and writes `stock_movements (type: 'RETURN')`. If `restock == false`, writes `stock_movements (type: 'DAMAGE')`.
5. Creates master `refunds` and detail `refund_items` records.
6. Increments `sale_items.refunded_quantity` and `sales.refunded_amount`.
7. Adjusts `sales.status` to `'PARTIALLY_REFUNDED'` or `'REFUNDED'`.
8. Adjusts customer ledger:
   - If `refund_method == 'STORE_CREDIT'`: increments `customer.store_credit`.
   - If original sale was unpaid: decreases `sale.balance_due` and `customer.outstanding_balance`.
   - If cash/bank refund: records cash disbursement.

---

### F. Customers
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/customers` | Authenticated | List customers with search, balance summary, store credit, pagination |
| `POST` | `/api/customers` | Authenticated | Create customer record |
| `GET` | `/api/customers/:id` | Authenticated | Get customer details and balance breakdown |
| `PUT` | `/api/customers/:id` | Authenticated | Update customer profile |
| `DELETE` | `/api/customers/:id` | Admin | Deactivate customer |
| `GET` | `/api/customers/:id/sales` | Authenticated | Invoice history for specific customer |
| `POST` | `/api/customers/:id/reconcile`| Admin | Reconciles customer's `outstanding_balance` against active invoice dues and store credits |

---

### G. Employees & Human Resources
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/employees` | Admin | List all employees |
| `POST` | `/api/employees` | Admin | Create employee record |
| `GET` | `/api/employees/:id` | Admin | Get employee details |
| `PUT` | `/api/employees/:id` | Admin | Update employee details |
| `DELETE` | `/api/employees/:id` | Admin | Deactivate employee |
| `GET` | `/api/attendance` | Authenticated | Get attendance records by month/date |
| `POST` | `/api/attendance` | Authenticated | Mark daily employee attendance (prevents duplicates for same date) |
| `GET` | `/api/salaries` | Admin | Get monthly salary disbursement records |
| `POST` | `/api/salaries` | Admin | Generate or record monthly salary payment |
| `PUT` | `/api/salaries/:id` | Admin | Update salary record or mark as PAID |

---

### H. Expense Management
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/expenses` | Authenticated | List expenses with category and date filtering |
| `POST` | `/api/expenses` | Authenticated | Record business expense |
| `GET` | `/api/expenses/:id` | Authenticated | Get expense details |
| `PUT` | `/api/expenses/:id` | Admin | Update expense record |
| `DELETE` | `/api/expenses/:id` | Admin | Delete expense record |

---

### I. Dashboard & Reports
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reports/dashboard` | Authenticated | Real-time KPI summaries: sales, revenue, COGS, gross profit, net profit, low stock count, 7-day trend |
| `GET` | `/api/reports/sales` | Authenticated | Detailed sales report by date range, day/week/month aggregation, net of refunds |
| `GET` | `/api/reports/profit-loss` | Admin | Income statement: Net Sales, Adjusted COGS, Gross Profit, OPEX, Net Operating Profit |
| `GET` | `/api/reports/inventory-valuation`| Authenticated | Stock levels, cost valuation, retail valuation, potential margin |
| `GET` | `/api/reports/export/sales` | Authenticated | Export sales and transaction ledger as CSV (sanitized against formula injection) |
| `GET` | `/api/reports/export/inventory` | Authenticated | Export inventory valuation report as CSV (sanitized against formula injection) |

---

### J. Business Settings
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/businesses/me` | Authenticated | Retrieve business profile, GST tax configuration, currency |
| `PUT` | `/api/businesses/me` | Admin | Update business profile, address, state, GSTIN tax number, currency |
| `GET` | `/api/settings` | Authenticated | Legacy alias for business settings |
| `PUT` | `/api/settings` | Admin | Legacy alias for business settings |
