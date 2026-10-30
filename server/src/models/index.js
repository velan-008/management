import { sequelize } from '../database/connection.js';
import { Business } from './Business.js';
import { User } from './User.js';
import { Category } from './Category.js';
import { Product } from './Product.js';
import { StockMovement } from './StockMovement.js';
import { Customer } from './Customer.js';
import { Sale } from './Sale.js';
import { SaleItem } from './SaleItem.js';
import { Payment } from './Payment.js';
import { Refund } from './Refund.js';
import { RefundItem } from './RefundItem.js';
import { Expense } from './Expense.js';
import { Employee } from './Employee.js';
import { Attendance } from './Attendance.js';
import { Salary } from './Salary.js';
import { AuditLog } from './AuditLog.js';
import { Supplier } from './Supplier.js';
import { Purchase } from './Purchase.js';
import { PurchaseItem } from './PurchaseItem.js';
import { SupplierPayment } from './SupplierPayment.js';

// --- Associations ---

// Business <-> User
Business.hasMany(User, { foreignKey: 'business_id', as: 'users', onDelete: 'CASCADE' });
User.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Business <-> Category
Business.hasMany(Category, { foreignKey: 'business_id', as: 'categories', onDelete: 'CASCADE' });
Category.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Business <-> Product
Business.hasMany(Product, { foreignKey: 'business_id', as: 'products', onDelete: 'CASCADE' });
Product.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Category <-> Product
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products', onDelete: 'SET NULL' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Business <-> StockMovement
Business.hasMany(StockMovement, { foreignKey: 'business_id', as: 'stockMovements', onDelete: 'CASCADE' });
StockMovement.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Product <-> StockMovement
Product.hasMany(StockMovement, { foreignKey: 'product_id', as: 'movements', onDelete: 'RESTRICT' });
StockMovement.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User <-> StockMovement
User.hasMany(StockMovement, { foreignKey: 'user_id', as: 'stockMovements', onDelete: 'SET NULL' });
StockMovement.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Business <-> Customer
Business.hasMany(Customer, { foreignKey: 'business_id', as: 'customers', onDelete: 'CASCADE' });
Customer.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Business <-> Sale
Business.hasMany(Sale, { foreignKey: 'business_id', as: 'sales', onDelete: 'CASCADE' });
Sale.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Customer <-> Sale
Customer.hasMany(Sale, { foreignKey: 'customer_id', as: 'sales', onDelete: 'SET NULL' });
Sale.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

// User <-> Sale
User.hasMany(Sale, { foreignKey: 'user_id', as: 'sales', onDelete: 'RESTRICT' });
Sale.belongsTo(User, { foreignKey: 'user_id', as: 'cashier' });

// Sale <-> SaleItem
Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items', onDelete: 'CASCADE' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

// Product <-> SaleItem
Product.hasMany(SaleItem, { foreignKey: 'product_id', as: 'saleItems', onDelete: 'RESTRICT' });
SaleItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Business <-> SaleItem
Business.hasMany(SaleItem, { foreignKey: 'business_id', as: 'saleItems', onDelete: 'CASCADE' });
SaleItem.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Sale <-> Payment
Sale.hasMany(Payment, { foreignKey: 'sale_id', as: 'payments', onDelete: 'CASCADE' });
Payment.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

// Business <-> Payment
Business.hasMany(Payment, { foreignKey: 'business_id', as: 'payments', onDelete: 'CASCADE' });
Payment.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Sale <-> Refund
Sale.hasMany(Refund, { foreignKey: 'sale_id', as: 'refunds', onDelete: 'RESTRICT' });
Refund.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

// Business <-> Refund
Business.hasMany(Refund, { foreignKey: 'business_id', as: 'refunds', onDelete: 'CASCADE' });
Refund.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Customer <-> Refund
Customer.hasMany(Refund, { foreignKey: 'customer_id', as: 'refunds', onDelete: 'SET NULL' });
Refund.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

// User <-> Refund
User.hasMany(Refund, { foreignKey: 'user_id', as: 'refunds', onDelete: 'RESTRICT' });
Refund.belongsTo(User, { foreignKey: 'user_id', as: 'processedBy' });

// Refund <-> RefundItem
Refund.hasMany(RefundItem, { foreignKey: 'refund_id', as: 'items', onDelete: 'CASCADE' });
RefundItem.belongsTo(Refund, { foreignKey: 'refund_id', as: 'refund' });

// SaleItem <-> RefundItem
SaleItem.hasMany(RefundItem, { foreignKey: 'sale_item_id', as: 'refunds', onDelete: 'RESTRICT' });
RefundItem.belongsTo(SaleItem, { foreignKey: 'sale_item_id', as: 'saleItem' });

// Product <-> RefundItem
Product.hasMany(RefundItem, { foreignKey: 'product_id', as: 'refundItems', onDelete: 'RESTRICT' });
RefundItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Business <-> RefundItem
Business.hasMany(RefundItem, { foreignKey: 'business_id', as: 'refundItems', onDelete: 'CASCADE' });
RefundItem.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Business <-> Expense
Business.hasMany(Expense, { foreignKey: 'business_id', as: 'expenses', onDelete: 'CASCADE' });
Expense.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// User <-> Expense
User.hasMany(Expense, { foreignKey: 'created_by', as: 'expenses', onDelete: 'SET NULL' });
Expense.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Business <-> Employee
Business.hasMany(Employee, { foreignKey: 'business_id', as: 'employees', onDelete: 'CASCADE' });
Employee.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// User <-> Employee
User.hasOne(Employee, { foreignKey: 'user_id', as: 'employeeProfile', onDelete: 'SET NULL' });
Employee.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Employee <-> Attendance
Employee.hasMany(Attendance, { foreignKey: 'employee_id', as: 'attendanceRecords', onDelete: 'CASCADE' });
Attendance.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// Business <-> Attendance
Business.hasMany(Attendance, { foreignKey: 'business_id', as: 'attendanceRecords', onDelete: 'CASCADE' });
Attendance.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Employee <-> Salary
Employee.hasMany(Salary, { foreignKey: 'employee_id', as: 'salaries', onDelete: 'CASCADE' });
Salary.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// Business <-> Salary
Business.hasMany(Salary, { foreignKey: 'business_id', as: 'salaries', onDelete: 'CASCADE' });
Salary.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Business <-> AuditLog
Business.hasMany(AuditLog, { foreignKey: 'business_id', as: 'auditLogs', onDelete: 'CASCADE' });
AuditLog.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// User <-> AuditLog
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs', onDelete: 'SET NULL' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Business <-> Supplier
Business.hasMany(Supplier, { foreignKey: 'business_id', as: 'suppliers', onDelete: 'CASCADE' });
Supplier.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Business <-> Purchase
Business.hasMany(Purchase, { foreignKey: 'business_id', as: 'purchases', onDelete: 'CASCADE' });
Purchase.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Supplier <-> Purchase
Supplier.hasMany(Purchase, { foreignKey: 'supplier_id', as: 'purchases', onDelete: 'RESTRICT' });
Purchase.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

// User <-> Purchase (Staff/Admin who placed or processed PO)
User.hasMany(Purchase, { foreignKey: 'user_id', as: 'purchases', onDelete: 'SET NULL' });
Purchase.belongsTo(User, { foreignKey: 'user_id', as: 'creator' });

// Purchase <-> PurchaseItem
Purchase.hasMany(PurchaseItem, { foreignKey: 'purchase_id', as: 'items', onDelete: 'CASCADE' });
PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase' });

// Product <-> PurchaseItem
Product.hasMany(PurchaseItem, { foreignKey: 'product_id', as: 'purchaseItems', onDelete: 'SET NULL' });
PurchaseItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Business <-> SupplierPayment
Business.hasMany(SupplierPayment, { foreignKey: 'business_id', as: 'supplierPayments', onDelete: 'CASCADE' });
SupplierPayment.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Supplier <-> SupplierPayment
Supplier.hasMany(SupplierPayment, { foreignKey: 'supplier_id', as: 'payments', onDelete: 'CASCADE' });
SupplierPayment.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

// Purchase <-> SupplierPayment
Purchase.hasMany(SupplierPayment, { foreignKey: 'purchase_id', as: 'payments', onDelete: 'SET NULL' });
SupplierPayment.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase' });

export {
  sequelize,
  Business,
  User,
  Category,
  Product,
  StockMovement,
  Customer,
  Sale,
  SaleItem,
  Payment,
  Refund,
  RefundItem,
  Expense,
  Employee,
  Attendance,
  Salary,
  AuditLog,
  Supplier,
  Purchase,
  PurchaseItem,
  SupplierPayment
};
