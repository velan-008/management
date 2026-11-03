import bcrypt from 'bcryptjs';
import {
  sequelize, Business, User, Category, Product, Customer, Employee, Sale, SaleItem, Payment, Expense,
  Supplier, Purchase, PurchaseItem, SupplierPayment, ProductUnit, Inventory,
  SubCategory, Brand, Unit
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

  // Default FMCG Categories
  const fmcgCategoriesData = [
    { name: 'Chocolates', description: 'Chocolates and confectionery' },
    { name: 'Biscuits', description: 'Glucose, Marie, Cream & Butter Cookies' },
    { name: 'Soft Drinks', description: 'Carbonated soft drinks, cola, and beverages' },
    { name: 'Snacks', description: 'Chips, namkeen, puffs and savory snacks' },
    { name: 'Candies', description: 'Hard candies, toffees and mints' },
    { name: 'Cakes', description: 'Packaged cakes, muffins and brownies' },
    { name: 'Juices', description: 'Fruit juices, nectar and pulp drinks' },
    { name: 'Ice Cream', description: 'Cups, cones and family pack ice creams' },
    { name: 'Noodles', description: 'Instant noodles, cup noodles and pasta' },
    { name: 'Dairy Products', description: 'Milk, cheese, butter and dairy beverages' },
    { name: 'Tea & Coffee', description: 'Tea leaves, dust and instant coffee' },
    { name: 'Bakery Products', description: 'Breads, buns, rusks and bakery essentials' },
    { name: 'Packaged Drinking Water', description: 'Mineral water, purified water bottles and cans' }
  ];

  const categoryMap = {
    'Chocolates & Confectionery': catChocolates,
    'Biscuits & Cookies': catBiscuits,
    'Beverages & Soft Drinks': catBeverages,
    'Snacks & Namkeen': catSnacks
  };

  for (const catData of fmcgCategoriesData) {
    const [c] = await Category.findOrCreate({
      where: { business_id: business1.id, name: catData.name },
      defaults: {
        business_id: business1.id,
        name: catData.name,
        description: catData.description,
        status: 'ACTIVE'
      }
    });
    categoryMap[catData.name] = c;
  }

  // Default FMCG Sub-Categories
  const fmcgSubCategoriesData = [
    { category: 'Chocolates', name: 'Chocolate Bars', description: 'Solid milk and dark chocolate bars' },
    { category: 'Chocolates', name: 'Wafer Chocolates', description: 'Crispy wafer chocolate bars' },
    { category: 'Chocolates', name: 'Chocolate Boxes', description: 'Gift packs and chocolate boxes' },
    { category: 'Biscuits', name: 'Cream Biscuits', description: 'Sandwich cream biscuits' },
    { category: 'Biscuits', name: 'Glucose Biscuits', description: 'Everyday energy glucose biscuits' },
    { category: 'Biscuits', name: 'Cookies', description: 'Butter and chocolate chip cookies' },
    { category: 'Soft Drinks', name: 'Cola', description: 'Carbonated cola drinks' },
    { category: 'Soft Drinks', name: 'Orange Drinks', description: 'Sparkling orange flavored soft drinks' },
    { category: 'Soft Drinks', name: 'Lemon Drinks', description: 'Clear lime and lemon soda' },
    { category: 'Snacks', name: 'Chips', description: 'Crispy potato wafers and chips' },
    { category: 'Snacks', name: 'Namkeen', description: 'Traditional bhujia, sev and mixtures' },
    { category: 'Snacks', name: 'Puffs', description: 'Extruded corn and cheese puffs' },
    { category: 'Juices', name: 'Fruit Juice', description: '100% natural fruit juice' },
    { category: 'Juices', name: 'Juice Drinks', description: 'Sweetened fruit juice beverages' },
    { category: 'Candies', name: 'Hard Candies', description: 'Fruit drops and hard candies' },
    { category: 'Candies', name: 'Chewy Candies', description: 'Toffees and chews' },
    { category: 'Candies', name: 'Lollipops', description: 'Assorted fruit lollipops' },
    { category: 'Cakes', name: 'Cupcakes', description: 'Single-serve frosted cupcakes' },
    { category: 'Cakes', name: 'Sponge Cakes', description: 'Layer sponge and pound cakes' },
    { category: 'Cakes', name: 'Fruit Cakes', description: 'Enriched fruit and plum cakes' },
    { category: 'Ice Cream', name: 'Cones', description: 'Waffle and biscuit cone ice creams' },
    { category: 'Ice Cream', name: 'Cups', description: 'Single serve ice cream cups' },
    { category: 'Ice Cream', name: 'Family Packs', description: 'Tub and brick family pack ice creams' },
    { category: 'Noodles', name: 'Instant Noodles', description: 'Quick cooking masala noodles' },
    { category: 'Noodles', name: 'Cup Noodles', description: 'Ready-to-eat hot cup noodles' },
    { category: 'Noodles', name: 'Hakka Noodles', description: 'Wok tossed and stir fry noodles' },
    { category: 'Dairy Products', name: 'Milk', description: 'Pasteurized packaged milk' },
    { category: 'Dairy Products', name: 'Butter', description: 'Salted and unsalted table butter' },
    { category: 'Dairy Products', name: 'Cheese', description: 'Processed and mozzarella cheese blocks' },
    { category: 'Dairy Products', name: 'Curd', description: 'Natural and probiotic cup curd' },
    { category: 'Tea & Coffee', name: 'Black Tea', description: 'Leaf and CTC black tea blends' },
    { category: 'Tea & Coffee', name: 'Green Tea', description: 'Antioxidant rich green tea bags' },
    { category: 'Tea & Coffee', name: 'Instant Coffee', description: 'Aromatic instant coffee granules' },
    { category: 'Tea & Coffee', name: 'Roast Coffee', description: 'Filter and ground roast coffee' },
    { category: 'Bakery Products', name: 'Breads', description: 'White, brown and whole wheat breads' },
    { category: 'Bakery Products', name: 'Buns', description: 'Burger and pav buns' },
    { category: 'Bakery Products', name: 'Rusks', description: 'Crispy toasted tea rusks' },
    { category: 'Packaged Drinking Water', name: '500ml Bottle', description: '500ml pet water bottles' },
    { category: 'Packaged Drinking Water', name: '1 Litre Bottle', description: '1 litre packaged water bottles' },
    { category: 'Packaged Drinking Water', name: '20L Can', description: '20 litre dispenser water jars' }
  ];

  const subCategoryMap = {};
  for (const sc of fmcgSubCategoriesData) {
    const parentCat = categoryMap[sc.category];
    if (parentCat) {
      const [item] = await SubCategory.findOrCreate({
        where: { business_id: business1.id, category_id: parentCat.id, name: sc.name },
        defaults: {
          business_id: business1.id,
          category_id: parentCat.id,
          name: sc.name,
          description: sc.description,
          status: 'ACTIVE'
        }
      });
      subCategoryMap[sc.name] = item;
    }
  }

  // Default FMCG Brands
  const fmcgBrandsData = [
    { name: 'Cadbury', description: 'Mondelez confectionery brand' },
    { name: 'Nestlé', description: 'Global food and beverage manufacturer' },
    { name: 'KitKat', description: 'Crisp wafer chocolate brand' },
    { name: 'Dairy Milk', description: 'Flagship milk chocolate brand' },
    { name: 'Britannia', description: 'Biscuits, dairy and bakery brand' },
    { name: 'Oreo', description: 'Cream sandwich biscuit brand' },
    { name: 'Coca-Cola', description: 'Carbonated soft drink brand' },
    { name: 'Pepsi', description: 'Global beverage brand' },
    { name: 'Fanta', description: 'Fruit-flavored carbonated beverage' },
    { name: 'Sprite', description: 'Lemon-lime flavored soft drink' },
    { name: "Lay's", description: 'Potato chips brand' },
    { name: 'Bingo', description: 'ITC finger snacks and chips' },
    { name: 'Parle', description: 'Parle-G, biscuits and confectionery' },
    { name: 'Amul', description: 'The Taste of India dairy products' },
    { name: 'Maggi', description: 'Instant noodles and culinary products' },
    { name: "Haldiram's", description: 'Traditional Indian namkeen and sweets' }
  ];

  const brandMap = {};
  for (const b of fmcgBrandsData) {
    const [brandItem] = await Brand.findOrCreate({
      where: { business_id: business1.id, name: b.name },
      defaults: {
        business_id: business1.id,
        name: b.name,
        description: b.description,
        status: 'ACTIVE'
      }
    });
    brandMap[b.name] = brandItem;
  }

  // Default FMCG Units
  const fmcgUnitsData = [
    { name: 'Pcs', code: 'PCS', description: 'Individual piece count' },
    { name: 'Pack', code: 'PACK', description: 'Consumer unit pack' },
    { name: 'Box', code: 'BOX', description: 'Intermediate box packing' },
    { name: 'Carton', code: 'CTN', description: 'Master wholesale carton' },
    { name: 'Bottle', code: 'BTL', description: 'Bottle container' },
    { name: 'Can', code: 'CAN', description: 'Tin / aluminum beverage can' },
    { name: 'Crate', code: 'CRT', description: 'Reusable beverage crate' },
    { name: 'Kg', code: 'KG', description: 'Kilogram metric weight' },
    { name: 'Gram', code: 'GM', description: 'Gram weight' },
    { name: 'Litre', code: 'L', description: 'Litre volumetric measure' },
    { name: 'Ml', code: 'ML', description: 'Millilitre volumetric measure' },
    { name: 'Dozen', code: 'DOZ', description: 'Pack of 12 units' },
    { name: 'Bundle', code: 'BDL', description: 'Wholesale tied bundle' }
  ];

  const unitMap = {};
  for (const u of fmcgUnitsData) {
    const [unitItem] = await Unit.findOrCreate({
      where: { business_id: business1.id, code: u.code },
      defaults: {
        business_id: business1.id,
        name: u.name,
        code: u.code,
        description: u.description,
        status: 'ACTIVE'
      }
    });
    unitMap[u.code] = unitItem;
  }

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

  // Product Units & Batches for Wholesale Products
  // 1. Parle-G Units (PCS, BOX, CTN)
  await ProductUnit.findOrCreate({
    where: { product_id: prodParleG.id, unit_name: 'PCS' },
    defaults: { product_id: prodParleG.id, unit_name: 'PCS', conversion_factor: 1, wholesale_price: 2.00, retail_price: 2.50 }
  });
  await ProductUnit.findOrCreate({
    where: { product_id: prodParleG.id, unit_name: 'BOX' },
    defaults: { product_id: prodParleG.id, unit_name: 'BOX', conversion_factor: 12, wholesale_price: 24.00, retail_price: 28.00 }
  });
  await ProductUnit.findOrCreate({
    where: { product_id: prodParleG.id, unit_name: 'CTN' },
    defaults: { product_id: prodParleG.id, unit_name: 'CTN', conversion_factor: 144, wholesale_price: 270.00, retail_price: 320.00 }
  });

  // Parle-G Batches in Inventory
  await Inventory.findOrCreate({
    where: { business_id: business1.id, product_id: prodParleG.id, batch_number: 'BATCH-2026-PG1' },
    defaults: {
      business_id: business1.id,
      product_id: prodParleG.id,
      batch_number: 'BATCH-2026-PG1',
      expiry_date: '2027-02-28',
      stock_quantity: 1500
    }
  });
  await Inventory.findOrCreate({
    where: { business_id: business1.id, product_id: prodParleG.id, batch_number: 'BATCH-2026-PG2' },
    defaults: {
      business_id: business1.id,
      product_id: prodParleG.id,
      batch_number: 'BATCH-2026-PG2',
      expiry_date: '2026-11-20',
      stock_quantity: 300
    }
  });

  // 2. Cadbury Dairy Milk Silk Units (PCS, BOX, CTN)
  await ProductUnit.findOrCreate({
    where: { product_id: prodDairyMilk.id, unit_name: 'PCS' },
    defaults: { product_id: prodDairyMilk.id, unit_name: 'PCS', conversion_factor: 1, wholesale_price: 70.00, retail_price: 80.00 }
  });
  await ProductUnit.findOrCreate({
    where: { product_id: prodDairyMilk.id, unit_name: 'BOX' },
    defaults: { product_id: prodDairyMilk.id, unit_name: 'BOX', conversion_factor: 24, wholesale_price: 1680.00, retail_price: 1920.00 }
  });
  await ProductUnit.findOrCreate({
    where: { product_id: prodDairyMilk.id, unit_name: 'CTN' },
    defaults: { product_id: prodDairyMilk.id, unit_name: 'CTN', conversion_factor: 240, wholesale_price: 16000.00, retail_price: 18500.00 }
  });

  // Cadbury Batches in Inventory
  await Inventory.findOrCreate({
    where: { business_id: business1.id, product_id: prodDairyMilk.id, batch_number: 'BATCH-CAD-402' },
    defaults: {
      business_id: business1.id,
      product_id: prodDairyMilk.id,
      batch_number: 'BATCH-CAD-402',
      expiry_date: '2026-12-31',
      stock_quantity: 960
    }
  });

  // 3. Kurkure Units (PCS, BOX, CTN)
  await ProductUnit.findOrCreate({
    where: { product_id: prodKurkure.id, unit_name: 'PCS' },
    defaults: { product_id: prodKurkure.id, unit_name: 'PCS', conversion_factor: 1, wholesale_price: 16.00, retail_price: 20.00 }
  });
  await ProductUnit.findOrCreate({
    where: { product_id: prodKurkure.id, unit_name: 'BOX' },
    defaults: { product_id: prodKurkure.id, unit_name: 'BOX', conversion_factor: 40, wholesale_price: 640.00, retail_price: 760.00 }
  });
  await ProductUnit.findOrCreate({
    where: { product_id: prodKurkure.id, unit_name: 'CTN' },
    defaults: { product_id: prodKurkure.id, unit_name: 'CTN', conversion_factor: 240, wholesale_price: 3600.00, retail_price: 4300.00 }
  });

  // Kurkure Batches in Inventory
  await Inventory.findOrCreate({
    where: { business_id: business1.id, product_id: prodKurkure.id, batch_number: 'BATCH-KURK-08' },
    defaults: {
      business_id: business1.id,
      product_id: prodKurkure.id,
      batch_number: 'BATCH-KURK-08',
      expiry_date: '2026-10-15',
      stock_quantity: 120
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
      customer_type: 'BULK',
      credit_limit: 5000.00,
      outstanding_balance: 1200.00,
      store_credit: 0.00,
      status: 'ACTIVE'
    }
  });

  const [customerMetro] = await Customer.findOrCreate({
    where: { business_id: business1.id, name: 'Metro Supermarket' },
    defaults: {
      business_id: business1.id,
      name: 'Metro Supermarket',
      email: 'orders@metrosuper.com',
      phone: '+1-555-9922',
      tax_number: 'GST-METRO-99',
      address: '74 Market Square, Downtown',
      state: 'California',
      customer_type: 'SUB_WHOLESALER',
      credit_limit: 15000.00,
      outstanding_balance: 13500.00, // Near limit (90%)!
      store_credit: 0.00,
      status: 'ACTIVE'
    }
  });

  const [customerCityRetail] = await Customer.findOrCreate({
    where: { business_id: business1.id, name: 'City Retail Mart' },
    defaults: {
      business_id: business1.id,
      name: 'City Retail Mart',
      email: 'contact@cityretailmart.com',
      phone: '+1-555-4411',
      tax_number: 'GST-CITY-21',
      address: '12 Avenue Central, California',
      state: 'California',
      customer_type: 'REGULAR',
      credit_limit: 2000.00,
      outstanding_balance: 0.00,
      store_credit: 0.00,
      status: 'ACTIVE'
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
