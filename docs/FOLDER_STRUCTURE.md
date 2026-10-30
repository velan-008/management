# BUSINESSFLOW — Monorepo Architecture & Folder Structure

The project is structured as a cohesive, decoupled full-stack monorepo featuring a clean separation between the Express/Node.js API backend (`server/`) and the React/Vite SPA frontend (`client/`).

```
e:\mangement\
│
├── .gitignore                          # Root git ignore (node_modules, .env, dist, etc.)
├── README.md                           # Master setup, architectural summary, commands
│
├── docs/                               # Engineering documentation
│   ├── ARCHITECTURE.md                 # System overview, security model, accounting rules
│   ├── DATABASE_SCHEMA.md              # MySQL ER diagrams, tables, data types, indexes
│   ├── API_SPECIFICATION.md            # REST API endpoint specifications & payloads
│   └── FOLDER_STRUCTURE.md             # Repository directory map (this file)
│
├── server/                             # Backend API (Node.js, Express, Sequelize, MySQL)
│   ├── package.json                    # Backend dependencies and run scripts
│   ├── .env.example                    # Environment variable template with safe placeholders
│   ├── .sequelizerc                    # Sequelize CLI path configuration
│   ├── server.js                       # Server entry point & listener
│   │
│   ├── src/
│   │   ├── app.js                      # Express app configuration & middleware pipeline
│   │   │
│   │   ├── config/                     # Configuration modules
│   │   │   ├── db.config.js            # Sequelize database connection pool settings
│   │   │   ├── jwt.config.js           # JWT secrets, algorithm, expiration settings
│   │   │   └── env.config.js           # Validated environment variables
│   │   │
│   │   ├── database/                   # Migrations & Seeders
│   │   │   ├── connection.js           # Sequelize instance initialization
│   │   │   ├── migrations/             # Timestamped migration files
│   │   │   │   ├── 001-create-businesses.js
│   │   │   │   ├── 002-create-users.js
│   │   │   │   ├── 003-create-categories.js
│   │   │   │   ├── 004-create-products.js
│   │   │   │   ├── 005-create-stock-movements.js
│   │   │   │   ├── 006-create-customers.js
│   │   │   │   ├── 007-create-sales.js
│   │   │   │   ├── 008-create-sale-items.js
│   │   │   │   ├── 009-create-payments.js
│   │   │   │   ├── 010-create-expenses.js
│   │   │   │   ├── 011-create-employees.js
│   │   │   │   ├── 012-create-attendance.js
│   │   │   │   ├── 013-create-salaries.js
│   │   │   │   ├── 014-create-audit-logs.js
│   │   │   │   ├── 015-create-refunds.js
│   │   │   │   └── 016-create-refund-items.js
│   │   │   └── seeders/                # Realistic demo/seed dataset
│   │   │       ├── 001-demo-business-and-users.js
│   │   │       ├── 002-demo-categories-and-products.js
│   │   │       ├── 003-demo-customers.js
│   │   │       ├── 004-demo-sales-and-payments.js
│   │   │       └── 005-demo-hr-and-expenses.js
│   │   │
│   │   ├── models/                     # Sequelize Model definitions & associations
│   │   │   ├── index.js                # Model loader and relational association linker
│   │   │   ├── Business.js
│   │   │   ├── User.js
│   │   │   ├── Category.js
│   │   │   ├── Product.js
│   │   │   ├── StockMovement.js
│   │   │   ├── Customer.js
│   │   │   ├── Sale.js
│   │   │   ├── SaleItem.js
│   │   │   ├── Payment.js
│   │   │   ├── Refund.js
│   │   │   ├── RefundItem.js
│   │   │   ├── Expense.js
│   │   │   ├── Employee.js
│   │   │   ├── Attendance.js
│   │   │   ├── Salary.js
│   │   │   └── AuditLog.js
│   │   │
│   │   ├── middleware/                 # Security, auth, and request interceptors
│   │   │   ├── auth.middleware.js      # JWT authentication and user context injection
│   │   │   ├── role.middleware.js      # Role-based access control (Admin vs Staff)
│   │   │   ├── rateLimiter.js          # Express rate limiting
│   │   │   ├── validate.middleware.js  # Joi schema validation runner
│   │   │   └── error.middleware.js     # Centralized error handler & status codes
│   │   │
│   │   ├── validations/                # Request payload schemas
│   │   │   ├── auth.validation.js
│   │   │   ├── product.validation.js
│   │   │   ├── sale.validation.js
│   │   │   ├── refund.validation.js
│   │   │   ├── customer.validation.js
│   │   │   ├── employee.validation.js
│   │   │   └── expense.validation.js
│   │   │
│   │   ├── services/                   # Business logic and computations
│   │   │   ├── calculation.service.js  # Tax, discounts, line totals, round-off, grand totals
│   │   │   ├── stock.service.js        # Atomic row-locked stock adjustments & movement logging
│   │   │   ├── refund.service.js       # Partial/full refunds, restocking & store credits
│   │   │   ├── reconciliation.service.js # Customer A/R and invoice dues reconciliation
│   │   │   ├── pdf.service.js          # Server-rendered tax invoice PDF generator
│   │   │   ├── audit.service.js        # Audit log creation utility
│   │   │   └── report.service.js       # Net sales, COGS, Gross Profit, Net Operating Profit
│   │   │
│   │   ├── controllers/                # Request handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── user.controller.js
│   │   │   ├── category.controller.js
│   │   │   ├── product.controller.js
│   │   │   ├── sale.controller.js
│   │   │   ├── refund.controller.js
│   │   │   ├── customer.controller.js
│   │   │   ├── employee.controller.js
│   │   │   ├── attendance.controller.js
│   │   │   ├── salary.controller.js
│   │   │   ├── expense.controller.js
│   │   │   ├── report.controller.js
│   │   │   └── settings.controller.js
│   │   │
│   │   ├── routes/                     # Express REST route definitions
│   │   │   ├── index.js                # Master route aggregator (`/api`)
│   │   │   ├── auth.routes.js
│   │   │   ├── user.routes.js
│   │   │   ├── category.routes.js
│   │   │   ├── product.routes.js
│   │   │   ├── sale.routes.js
│   │   │   ├── refund.routes.js
│   │   │   ├── customer.routes.js
│   │   │   ├── employee.routes.js
│   │   │   ├── attendance.routes.js
│   │   │   ├── salary.routes.js
│   │   │   ├── expense.routes.js
│   │   │   ├── report.routes.js
│   │   │   └── settings.routes.js
│   │   │
│   │   └── utils/                      # Helper functions
│   │       ├── apiResponse.js          # Standardized JSON response formatting
│   │       ├── invoiceNumber.js        # Formatted invoice sequence generator
│   │       └── logger.js               # Structured logger
│   │
│   └── tests/                          # Backend test suite (Jest / Supertest)
│       ├── setup.js
│       ├── auth.test.js
│       ├── product.test.js
│       ├── sale-transaction.test.js
│       ├── refund.test.js
│       └── report.test.js
│
└── client/                             # Frontend SPA (React, Vite, Tailwind CSS)
    ├── package.json                    # Frontend dependencies and scripts
    ├── vite.config.js                  # Vite configuration & proxy setup
    ├── tailwind.config.js              # Tailwind theme, colors, typography
    ├── postcss.config.js
    ├── index.html                      # Entry HTML with modern font imports
    │
    └── src/
        ├── main.jsx                    # React root entry point
        ├── App.jsx                     # Application root with router and provider tree
        ├── index.css                   # Global styles, Tailwind base, dark mode tokens
        │
        ├── assets/                     # Logos, illustrations
        │
        ├── context/                    # React Context providers
        │   ├── AuthContext.jsx         # User session, login/logout, tokens
        │   ├── ThemeContext.jsx        # Light/Dark mode state and switcher
        │   └── NotificationContext.jsx # Toast and alert banner dispatcher
        │
        ├── services/                   # Axios API services
        │   ├── api.js                  # Axios instance with auth interceptors
        │   ├── authService.js
        │   ├── productService.js
        │   ├── salesService.js
        │   ├── refundService.js
        │   ├── customerService.js
        │   ├── employeeService.js
        │   ├── expenseService.js
        │   ├── reportService.js
        │   └── settingsService.js
        │
        ├── components/                 # Reusable UI component library
        │   ├── layout/
        │   │   ├── AppLayout.jsx       # Authenticated layout with Sidebar & Header
        │   │   ├── Sidebar.jsx         # Clean collapsible navigation bar
        │   │   ├── Header.jsx          # Search, notifications, theme toggle, profile
        │   │   └── ProtectedRoute.jsx  # Role-based route guard
        │   │
        │   ├── ui/                     # Design system atoms and molecules
        │   │   ├── Button.jsx
        │   │   ├── Input.jsx
        │   │   ├── Select.jsx
        │   │   ├── Modal.jsx
        │   │   ├── ConfirmationModal.jsx
        │   │   ├── Table.jsx
        │   │   ├── Pagination.jsx
        │   │   ├── Badge.jsx
        │   │   ├── Card.jsx
        │   │   ├── Skeleton.jsx        # Loading placeholders
        │   │   ├── EmptyState.jsx      # Zero-data friendly illustrations
        │   │   └── Toast.jsx
        │   │
        │   ├── dashboard/
        │   │   ├── MetricCard.jsx
        │   │   ├── SalesChart.jsx
        │   │   └── RecentTransactions.jsx
        │   │
        │   └── pos/                    # Point of Sale & Billing components
        │       ├── ProductSelector.jsx
        │       ├── CartTable.jsx
        │       ├── CustomerPicker.jsx
        │       ├── PaymentModal.jsx
        │       └── RefundModal.jsx     # Full/Partial refund & restock modal
        │
        ├── pages/                      # Application route views
        │   ├── auth/
        │   │   ├── LoginPage.jsx
        │   │   └── RegisterPage.jsx
        │   ├── dashboard/
        │   │   └── DashboardPage.jsx
        │   ├── inventory/
        │   │   ├── ProductsPage.jsx
        │   │   ├── CategoriesPage.jsx
        │   │   └── StockHistoryPage.jsx
        │   ├── billing/
        │   │   ├── POSBillingPage.jsx
        │   │   ├── InvoicesPage.jsx
        │   │   └── InvoiceDetailPage.jsx
        │   ├── customers/
        │   │   ├── CustomersPage.jsx
        │   │   └── CustomerDetailPage.jsx
        │   ├── hr/
        │   │   ├── EmployeesPage.jsx
        │   │   ├── AttendancePage.jsx
        │   │   └── SalariesPage.jsx
        │   ├── expenses/
        │   │   └── ExpensesPage.jsx
        │   ├── reports/
        │   │   ├── ReportsOverviewPage.jsx
        │   │   ├── SalesReportPage.jsx
        │   │   └── ProfitLossPage.jsx
        │   ├── settings/
        │   │   └── SettingsPage.jsx
        │   └── NotFoundPage.jsx
        │
        └── utils/                      # Frontend helper functions
            ├── formatters.js           # Currency and date formatters
            └── constants.js            # Tax brackets, payment methods, role enums
```
