export const up = async (queryInterface, Sequelize) => {
  // 1. Suppliers Table
  await queryInterface.createTable('suppliers', {
    id: {
      type: Sequelize.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    business_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'businesses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    name: {
      type: Sequelize.STRING(120),
      allowNull: false
    },
    company_name: {
      type: Sequelize.STRING(150),
      allowNull: true
    },
    email: {
      type: Sequelize.STRING(120),
      allowNull: true
    },
    phone: {
      type: Sequelize.STRING(25),
      allowNull: true
    },
    address: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    gst_number: {
      type: Sequelize.STRING(30),
      allowNull: true
    },
    state: {
      type: Sequelize.STRING(60),
      allowNull: true
    },
    payment_terms: {
      type: Sequelize.STRING(80),
      allowNull: true,
      defaultValue: 'Net 30'
    },
    outstanding_balance: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  });

  await queryInterface.addIndex('suppliers', ['business_id', 'phone'], {
    name: 'idx_suppliers_business_phone'
  });

  // 2. Purchases (Purchase Orders & Invoices) Table
  await queryInterface.createTable('purchases', {
    id: {
      type: Sequelize.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    business_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'businesses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    supplier_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'suppliers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    user_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    invoice_number: {
      type: Sequelize.STRING(60),
      allowNull: false
    },
    purchase_date: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('ORDERED', 'RECEIVED', 'PARTIALLY_RECEIVED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'ORDERED'
    },
    subtotal: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax_total: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    discount_total: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    freight_charges: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    grand_total: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    paid_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    balance_due: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    payment_status: {
      type: Sequelize.ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID'),
      allowNull: false,
      defaultValue: 'UNPAID'
    },
    payment_method: {
      type: Sequelize.STRING(40),
      allowNull: true,
      defaultValue: 'BANK_TRANSFER'
    },
    notes: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  });

  await queryInterface.addIndex('purchases', ['business_id', 'invoice_number'], {
    unique: true,
    name: 'idx_purchases_business_invoice'
  });

  // 3. Purchase Items Table
  await queryInterface.createTable('purchase_items', {
    id: {
      type: Sequelize.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    business_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'businesses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    purchase_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'purchases',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    product_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    product_name: {
      type: Sequelize.STRING(150),
      allowNull: false
    },
    product_sku: {
      type: Sequelize.STRING(60),
      allowNull: false
    },
    unit_cost_price: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    quantity_ordered: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    quantity_received: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    unit: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'pcs'
    },
    tax_rate: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    line_total: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  });

  // 4. Supplier Payments Table
  await queryInterface.createTable('supplier_payments', {
    id: {
      type: Sequelize.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    business_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'businesses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    supplier_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'suppliers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    purchase_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'purchases',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    payment_method: {
      type: Sequelize.ENUM('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'),
      allowNull: false,
      defaultValue: 'BANK_TRANSFER'
    },
    reference_number: {
      type: Sequelize.STRING(80),
      allowNull: true
    },
    payment_date: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    notes: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  });

  // 5. Add wholesale columns to products (safe checks)
  const productCols = await queryInterface.describeTable('products');
  if (!productCols.wholesale_price) {
    await queryInterface.addColumn('products', 'wholesale_price', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    });
  }
  if (!productCols.brand) {
    await queryInterface.addColumn('products', 'brand', {
      type: Sequelize.STRING(80),
      allowNull: true
    });
  }
  if (!productCols.batch_number) {
    await queryInterface.addColumn('products', 'batch_number', {
      type: Sequelize.STRING(60),
      allowNull: true
    });
  }
  if (!productCols.expiry_date) {
    await queryInterface.addColumn('products', 'expiry_date', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
  }
  if (!productCols.carton_pack_qty) {
    await queryInterface.addColumn('products', 'carton_pack_qty', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
  }

  // 6. Add approval_status to expenses (safe check)
  const expenseCols = await queryInterface.describeTable('expenses');
  if (!expenseCols.approval_status) {
    await queryInterface.addColumn('expenses', 'approval_status', {
      type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'APPROVED'
    });
  }
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('supplier_payments');
  await queryInterface.dropTable('purchase_items');
  await queryInterface.dropTable('purchases');
  await queryInterface.dropTable('suppliers');
};

