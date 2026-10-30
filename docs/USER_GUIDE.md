# BUSINESSFLOW — Operational User Guide

This guide describes how store owners (Admins) and retail cashiers (Staff) use the BUSINESSFLOW system.

---

## 1. Authentication & Roles

### Roles & Capabilities
- **ADMIN**:
  - Full access to all modules: POS, Inventory, Invoices, Customers, HR/Employees, Payroll, Expenses, Reports/P&L, and Settings.
  - Can create and modify staff accounts, change business details, and process refunds.
- **STAFF**:
  - Operational access: Point-of-Sale (POS), viewing product catalog, marking daily attendance, viewing customers, and recording operational expenses.
  - Restricted from viewing P&L statements, modifying business settings, or altering employee salaries.

---

## 2. Point of Sale (POS) & Checkout

1. **Accessing the POS**:
   - Navigate to `/pos` from the sidebar navigation.
2. **Adding Items to Cart**:
   - Search for products by name, SKU, or barcode using the search bar, or filter by category.
   - Click any product card to add 1 unit to the cart.
   - Click `+` or `-` in the cart drawer to adjust quantities. Current stock is shown on each card.
3. **Selecting a Customer**:
   - By default, transactions are attributed to a **Walk-in Customer**.
   - To link a registered customer, choose them from the customer dropdown.
   - If the customer is in the same state as your business, GST is split into **CGST + SGST**. If they are out of state, **IGST** is automatically calculated.
4. **Processing Payment**:
   - Select payment method: **Cash**, **Card**, **UPI**, or **Bank Transfer**.
   - Enter the paid amount. Full or partial payments are supported.
   - Click **Complete Sale**. The system atomically reserves stock, creates an invoice, logs payments, and records an inventory movement audit entry.

---

## 3. Invoices, Payments & Returns

1. **Viewing Invoices**:
   - Navigate to `/invoices` to view all transactions, filtered by date, customer, payment status, or order status.
2. **Printing Invoices**:
   - Click the eye icon to view invoice details, then click the **Print** icon to generate a formatted receipt or standard A4 invoice.
3. **Recording Subsequent Payments**:
   - Open a partially paid invoice and click **Record Payment** to log subsequent cash, card, or UPI collections.
4. **Processing Returns & Refunds (Admin Only)**:
   - In the invoice detail modal, click **Process Return / Refund**.
   - Enter return quantity and return reason.
   - Choose whether the returned items are resellable (which automatically restocks inventory) or damaged.

---

## 4. Inventory & Products

1. **Catalog Management**:
   - Navigate to `/inventory` to view products, current stock, cost price, and selling price.
   - Click **Add Product** to create a new SKU with barcode, unit, category, tax rate, and reorder threshold.
2. **Stock Adjustments**:
   - Click **Adjust Stock** on any product to record adjustments for received shipments, physical stock counts, or shrinkage.
   - Every adjustment writes an immutable record in the **Movement History** tab.

---

## 5. Customers & CRM

1. **Managing Customers**:
   - Navigate to `/customers` to view your customer directory.
   - Click **Add Customer** to record contact info, state, address, and GSTIN.
2. **Ledger & Outstanding Balances**:
   - View customer account balances, lifetime purchases, and historical invoices directly on the customer card.

---

## 6. Employees, Attendance & Payroll

1. **Staff Directory**:
   - Navigate to `/employees` to view active employees, departments, and designations.
   - Admins can click **Add Employee** and provision a user login with temporary credentials.
2. **Attendance Management**:
   - Record daily attendance (Present, Absent, Half-Day, Leave). Duplicate check-ins for the same day are rejected automatically.
3. **Monthly Payroll**:
   - Issue monthly salary disbursements specifying base salary, bonuses, and deductions.

---

## 7. Expenses, Analytics & Reports

1. **Operating Expenses**:
   - Navigate to `/expenses` to record operational costs such as rent, utilities, maintenance, and logistics.
2. **Executive Reports & Income Statement**:
   - Navigate to `/reports` to view live Net Revenue, Cost of Goods Sold, Gross Profit, Total Expenses, and Net Profit.
3. **CSV Data Exports**:
   - Click **Export Sales CSV** or **Export Inventory CSV** to download sanitized spreadsheets for external accounting and tax filing.
