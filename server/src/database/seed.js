import bcrypt from 'bcryptjs';
import {
  sequelize, Business, User, Category, Product, Customer, Employee, Sale, SaleItem, Payment, Expense,
  Supplier, Purchase, PurchaseItem, SupplierPayment
} from '../models/index.js';
import { logger } from '../utils/logger.js';

export const seedDatabase = async () => {
  logger.info('Starting development database seed...');

  const passwordHash = await bcrypt.hash('Admin@123456', 12);
  const staffPasswordHash = await bcrypt.hash('Staff@123456', 12);

  // 1. Primary Demo Business
  const [business1] = await Business.findOrCreate({
    where: { email: 'contact@apexretail.com' },
    defaults: {
      name: 'Apex Retail Solutions',
      email: 'contact@apexretail.com',
      phone: '+1-555-0199',
      address: '100 Enterprise Way, Suite 400',
      tax_number: 'TAX-US-9921',
      state: 'California',
      currency_code: 'USD',
      currency_symbol: '$'
    }
  });

  // Admin User
  const [adminUser] = await User.findOrCreate({
    where: { business_id: business1.id, email: 'admin@apexretail.com' },
    defaults: {
      business_id: business1.id,
      name: 'Sarah Connor (Admin)',
      email: 'admin@apexretail.com',
      password_hash: passwordHash,
      role: 'ADMIN',
      is_active: true
    }
  });

  // Staff User
  const [staffUser] = await User.findOrCreate({
    where: { business_id: business1.id, email: 'staff@apexretail.com' },
    defaults: {
      business_id: business1.id,
      name: 'John Doe (Cashier)',
      email: 'staff@apexretail.com',
      password_hash: staffPasswordHash,
      role: 'STAFF',
      is_active: true
    }
  });

  // 2. Secondary Tenant Business (For Multi-Tenant Isolation Testing)
  const [business2] = await Business.findOrCreate({
    where: { email: 'info@novaagency.com' },
    defaults: {
      name: 'Nova Digital Agency',
      email: 'info@novaagency.com',
      phone: '+1-555-0844',
      address: '77 Creative Blvd',
      tax_number: 'TAX-US-4433',
      state: 'New York',
      currency_code: 'USD',
      currency_symbol: '$'
    }
  });

  // Nova Admin User
  await User.findOrCreate({
    where: { business_id: business2.id, email: 'admin@novaagency.com' },
    defaults: {
      business_id: business2.id,
      name: 'Alex Rivera (Nova Admin)',
      email: 'admin@novaagency.com',
      password_hash: passwordHash,
      role: 'ADMIN',
      is_active: true
    }
  });

  // Wholesale Categories for Business 1
  const [catBiscuits] = await Category.findOrCreate({
    where: { business_id: business1.id, name: 'Biscuits & Cookies' },
    defaults: {
      business_id: business1.id,
      name: 'Biscuits & Cookies',
      description: 'Glucose, Marie, Cream & Butter Cookies in retail packs and cartons'
    }
  });

  const [catChocolates] = await Category.findOrCreate({
    where: { business_id: business1.id, name: 'Chocolates & Confectionery' },
    defaults: {
      business_id: business1.id,
      name: 'Chocolates & Confectionery',
      description: 'Milk chocolates, dark bars, wafers and candies'
    }
  });

  const [catBeverages] = await Category.findOrCreate({
    where: { business_id: business1.id, name: 'Beverages & Soft Drinks' },
    defaults: {
      business_id: business1.id,
      name: 'Beverages & Soft Drinks',
      description: 'Juices, carbonated soft drinks, packaged energy drinks'
    }
  });

  const [catSnacks] = await Category.findOrCreate({
    where: { business_id: business1.id, name: 'Snacks & Namkeen' },
    defaults: {
      business_id: business1.id,
      name: 'Snacks & Namkeen',
      description: 'Potato chips, extruded snacks, bhujia, and salted mixtures'
    }
  });

  // Wholesale Products for Business 1
  const [prodParleG] = await Product.findOrCreate({
    where: { business_id: business1.id, sku: 'SKU-BIS-PARLE10' },
    defaults: {
      business_id: business1.id,
      category_id: catBiscuits.id,
      name: 'Parle-G Gold Glucose Biscuit (Pack of 12)',
      sku: 'SKU-BIS-PARLE10',
      barcode: '890171910101',
      cost_price: 12.50,
      selling_price: 24.99,
      wholesale_price: 20.00,
      brand: 'Parle',
      batch_number: 'BATCH-2026-PG1',
      expiry_date: '2027-02-28',
      carton_pack_qty: 12,
      quantity: 150,
      low_stock_threshold: 25,
      tax_rate: 18.00,
      unit: 'boxes',
      is_active: true
    }
  });

  const [prodDairyMilk] = await Product.findOrCreate({
    where: { business_id: business1.id, sku: 'SKU-CHO-CADB50' },
    defaults: {
      business_id: business1.id,
      category_id: catChocolates.id,
      name: 'Cadbury Dairy Milk Silk Chocolate (Box of 24)',
      sku: 'SKU-CHO-CADB50',
      barcode: '890123302001',
      cost_price: 1440.00,
      selling_price: 1920.00,
      wholesale_price: 1680.00,
      brand: 'Cadbury / Mondelez',
      batch_number: 'BATCH-CAD-402',
      expiry_date: '2026-12-31',
      carton_pack_qty: 24,
      quantity: 40,
      low_stock_threshold: 10,
      tax_rate: 18.00,
      unit: 'boxes',
      is_active: true
    }
  });

  const [prodFrooti] = await Product.findOrCreate({
    where: { business_id: business1.id, sku: 'SKU-BEV-FROO160' },
    defaults: {
      business_id: business1.id,
      category_id: catBeverages.id,
      name: 'Frooti Mango Drink Tetra Pack (Carton of 30)',
      sku: 'SKU-BEV-FROO160',
      barcode: '890171900302',
      cost_price: 2.20,
      selling_price: 6.50,
      wholesale_price: 5.50,
      brand: 'Parle Agro',
      batch_number: 'BATCH-FRO-99',
      expiry_date: '2026-11-30',
      carton_pack_qty: 30,
      quantity: 110,
      low_stock_threshold: 20,
      tax_rate: 5.00,
      unit: 'cartons',
      is_active: true
    }
  });

  // Low Stock item to trigger dashboard alert (Wholesale snacks)
  const [prodKurkure] = await Product.findOrCreate({
    where: { business_id: business1.id, sku: 'SKU-SNK-KURK40' },
    defaults: {
      business_id: business1.id,
      category_id: catSnacks.id,
      name: 'Kurkure Masala Munch (Pack of 40)',
      sku: 'SKU-SNK-KURK40',
      barcode: '890149110204',
      cost_price: 8.00,
      selling_price: 19.99,
      wholesale_price: 16.00,
      brand: 'PepsiCo',
      batch_number: 'BATCH-KURK-08',
      expiry_date: '2026-10-15',
      carton_pack_qty: 40,
      quantity: 3, // Below threshold of 10!
      low_stock_threshold: 10,
      tax_rate: 18.00,
      unit: 'packs',
      is_active: true
    }
  });

  // Product for Business 2 (To test cross-tenant product query isolation)
  await Product.findOrCreate({
    where: { business_id: business2.id, sku: 'SKU-NOVA-DESIGN-HR' },
    defaults: {
      business_id: business2.id,
      name: 'UI/UX Design Retainer Hour',
      sku: 'SKU-NOVA-DESIGN-HR',
      barcode: null,
      cost_price: 45.00,
      selling_price: 120.00,
      quantity: 999,
      low_stock_threshold: 10,
      tax_rate: 18.00,
      unit: 'hrs',
      is_active: true
    }
  });

  // Customer for Business 1
  const [customerAcme] = await Customer.findOrCreate({
    where: { business_id: business1.id, name: 'Acme Corporation' },
    defaults: {
      business_id: business1.id,
      name: 'Acme Corporation',
      email: 'procurement@acme.com',
      phone: '+1-555-8833',
      tax_number: 'GST-ACME-44',
      address: '42 Wallaby Way, Sydney',
      state: 'California',
      credit_limit: 5000.00,
      outstanding_balance: 0.00,
      store_credit: 0.00
    }
  });

  // Employee for Business 1 (linked to staff user)
  await Employee.findOrCreate({
    where: { business_id: business1.id, user_id: staffUser.id },
    defaults: {
      business_id: business1.id,
      user_id: staffUser.id,
      first_name: 'John',
      last_name: 'Doe',
      email: 'staff@apexretail.com',
      phone: '+1-555-0144',
      designation: 'Senior Cashier & Sales Associate',
      department: 'Retail Operations',
      base_salary: 3200.00,
      joining_date: '2025-01-15',
      status: 'ACTIVE'
    }
  });

  // Seed sample completed sales for Business 1 across past few days
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];

  const [sale1] = await Sale.findOrCreate({
    where: { business_id: business1.id, invoice_number: 'INV-2026-0001' },
    defaults: {
      business_id: business1.id,
      customer_id: customerAcme.id,
      user_id: staffUser.id,
      invoice_number: 'INV-2026-0001',
      invoice_date: threeDaysAgo,
      subtotal: 49.98,
      discount_total: 0.00,
      order_discount: 0.00,
      tax_total: 9.00,
      cgst_total: 4.50,
      sgst_total: 4.50,
      igst_total: 0.00,
      round_off: 0.00,
      grand_total: 58.98,
      paid_amount: 58.98,
      refunded_amount: 0.00,
      balance_due: 0.00,
      payment_status: 'PAID',
      status: 'COMPLETED',
      notes: 'Corporate supplies order'
    }
  });

  await SaleItem.findOrCreate({
    where: { sale_id: sale1.id, product_id: prodParleG.id },
    defaults: {
      business_id: business1.id,
      sale_id: sale1.id,
      product_id: prodParleG.id,
      product_name: prodParleG.name,
      product_sku: prodParleG.sku,
      unit_cost_price: 12.50,
      unit_selling_price: 24.99,
      quantity: 2,
      refunded_quantity: 0,
      discount_percentage: 0.00,
      discount_amount: 0.00,
      taxable_amount: 49.98,
      tax_rate: 18.00,
      cgst_amount: 4.50,
      sgst_amount: 4.50,
      igst_amount: 0.00,
      tax_amount: 9.00,
      line_total: 58.98
    }
  });

  await Payment.findOrCreate({
    where: { sale_id: sale1.id, reference_number: 'TXN-9981' },
    defaults: {
      business_id: business1.id,
      sale_id: sale1.id,
      amount: 58.98,
      payment_method: 'CARD',
      reference_number: 'TXN-9981',
      payment_date: new Date(Date.now() - 3 * 86400000),
      notes: 'Visa corporate card payment'
    }
  });

  const [sale2] = await Sale.findOrCreate({
    where: { business_id: business1.id, invoice_number: 'INV-2026-0002' },
    defaults: {
      business_id: business1.id,
      customer_id: customerAcme.id,
      user_id: staffUser.id,
      invoice_number: 'INV-2026-0002',
      invoice_date: yesterday,
      subtotal: 65.00,
      discount_total: 5.00,
      order_discount: 0.00,
      tax_total: 3.00,
      cgst_total: 1.50,
      sgst_total: 1.50,
      igst_total: 0.00,
      round_off: 0.00,
      grand_total: 63.00,
      paid_amount: 63.00,
      refunded_amount: 0.00,
      balance_due: 0.00,
      payment_status: 'PAID',
      status: 'COMPLETED',
      notes: 'Office notebooks batch'
    }
  });

  await SaleItem.findOrCreate({
    where: { sale_id: sale2.id, product_id: prodFrooti.id },
    defaults: {
      business_id: business1.id,
      sale_id: sale2.id,
      product_id: prodFrooti.id,
      product_name: prodFrooti.name,
      product_sku: prodFrooti.sku,
      unit_cost_price: 2.20,
      unit_selling_price: 6.50,
      quantity: 10,
      refunded_quantity: 0,
      discount_percentage: 0.00,
      discount_amount: 5.00,
      taxable_amount: 60.00,
      tax_rate: 5.00,
      cgst_amount: 1.50,
      sgst_amount: 1.50,
      igst_amount: 0.00,
      tax_amount: 3.00,
      line_total: 63.00
    }
  });

  await Payment.findOrCreate({
    where: { sale_id: sale2.id, reference_number: 'UPI-3342' },
    defaults: {
      business_id: business1.id,
      sale_id: sale2.id,
      amount: 63.00,
      payment_method: 'UPI',
      reference_number: 'UPI-3342',
      payment_date: new Date(Date.now() - 86400000),
      notes: 'UPI instant settlement'
    }
  });

  // Seed expenses for Business 1
  await Expense.findOrCreate({
    where: { business_id: business1.id, description: 'Office High-Speed Internet' },
    defaults: {
      business_id: business1.id,
      category: 'Utilities',
      amount: 85.00,
      expense_date: yesterday,
      payment_method: 'BANK_TRANSFER',
      description: 'Office High-Speed Internet',
      created_by: adminUser.id
    }
  });

  await Expense.findOrCreate({
    where: { business_id: business1.id, description: 'Store Cleaning Supplies' },
    defaults: {
      business_id: business1.id,
      category: 'Maintenance',
      amount: 32.50,
      expense_date: today,
      payment_method: 'CASH',
      description: 'Store Cleaning Supplies',
      created_by: adminUser.id
    }
  });

  // Wholesale Suppliers
  const [supplierBritannia] = await Supplier.findOrCreate({
    where: { business_id: business1.id, name: 'Britannia & FMCG Distributors' },
    defaults: {
      business_id: business1.id,
      name: 'Britannia & FMCG Distributors',
      company_name: 'Britannia Wholesale Depot Ltd',
      email: 'orders@britannia-depot.com',
      phone: '+1-555-0811',
      address: '22 Industrial Estate, Logistics Zone',
      gst_number: '27AABCB1234D1Z5',
      state: 'California',
      payment_terms: 'Net 15 Days',
      outstanding_balance: 1250.00,
      is_active: true
    }
  });

  const [supplierMondelez] = await Supplier.findOrCreate({
    where: { business_id: business1.id, name: 'Mondelez Direct Wholesale' },
    defaults: {
      business_id: business1.id,
      name: 'Mondelez Direct Wholesale',
      company_name: 'Mondelez Regional Distributor',
      email: 'sales@mondelez-direct.com',
      phone: '+1-555-0922',
      address: '88 Confectionery Way, Suite 10',
      gst_number: '27AAACM9988E2Z1',
      state: 'California',
      payment_terms: 'Net 30 Days',
      outstanding_balance: 0.00,
      is_active: true
    }
  });

  // Sample Purchase Order & Received Goods
  const [purchase1] = await Purchase.findOrCreate({
    where: { business_id: business1.id, invoice_number: 'PO-2026-0001' },
    defaults: {
      business_id: business1.id,
      supplier_id: supplierBritannia.id,
      user_id: adminUser.id,
      invoice_number: 'PO-2026-0001',
      purchase_date: threeDaysAgo,
      status: 'RECEIVED',
      subtotal: 1800.00,
      tax_total: 90.00,
      discount_total: 50.00,
      freight_charges: 40.00,
      grand_total: 1880.00,
      paid_amount: 630.00,
      balance_due: 1250.00,
      payment_status: 'PARTIALLY_PAID',
      payment_method: 'BANK_TRANSFER',
      notes: 'Initial monthly stock of Parle & Britannia biscuits'
    }
  });

  await PurchaseItem.findOrCreate({
    where: { purchase_id: purchase1.id, product_name: 'Parle-G Gold Glucose Biscuit (Pack of 12)' },
    defaults: {
      business_id: business1.id,
      purchase_id: purchase1.id,
      product_id: prodParleG.id,
      product_name: 'Parle-G Gold Glucose Biscuit (Pack of 12)',
      product_sku: 'SKU-BIS-PARLE10',
      unit_cost_price: 90.00,
      quantity_ordered: 20,
      quantity_received: 20,
      unit: 'boxes',
      tax_rate: 5.00,
      tax_amount: 90.00,
      line_total: 1890.00
    }
  });

  await SupplierPayment.findOrCreate({
    where: { business_id: business1.id, reference_number: 'SPAY-2026-001' },
    defaults: {
      business_id: business1.id,
      supplier_id: supplierBritannia.id,
      purchase_id: purchase1.id,
      amount: 630.00,
      payment_method: 'BANK_TRANSFER',
      reference_number: 'SPAY-2026-001',
      payment_date: yesterday,
      notes: 'Advance transfer for PO-2026-0001'
    }
  });

  logger.info('Database seeded successfully.');
};

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(`Seed failed: ${err.message}`, { err });
      process.exit(1);
    });
}
