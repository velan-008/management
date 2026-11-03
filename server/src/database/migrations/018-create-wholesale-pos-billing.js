export const up = async (queryInterface, Sequelize) => {
  // Helper to safely add column if it doesn't already exist
  const safeAddColumn = async (table, column, definition) => {
    try {
      const description = await queryInterface.describeTable(table);
      if (!description[column]) {
        await queryInterface.addColumn(table, column, definition);
      }
    } catch (err) {
      // Table might not exist or column already exists
    }
  };

  // 1. Update Customers Table with customer_type and status
  await safeAddColumn('customers', 'customer_type', {
    type: Sequelize.ENUM('REGULAR', 'SUB_WHOLESALER', 'BULK'),
    allowNull: false,
    defaultValue: 'REGULAR'
  });

  await safeAddColumn('customers', 'status', {
    type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
    allowNull: false,
    defaultValue: 'ACTIVE'
  });

  // 2. Update Products Table with base_unit and status
  await safeAddColumn('products', 'base_unit', {
    type: Sequelize.STRING(20),
    allowNull: false,
    defaultValue: 'PCS'
  });

  await safeAddColumn('products', 'status', {
    type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
    allowNull: false,
    defaultValue: 'ACTIVE'
  });

  // 3. Create Product Units Table (product_units)
  const tables = await queryInterface.showAllTables();
  if (!tables.includes('product_units')) {
    await queryInterface.createTable('product_units', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      product_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      unit_name: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      conversion_factor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1.00
      },
      wholesale_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      retail_price: {
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

    await queryInterface.addIndex('product_units', ['product_id', 'unit_name'], {
      unique: true,
      name: 'idx_product_units_product_unit'
    });
  }

  // 4. Create Inventory / Batches Table (inventory)
  if (!tables.includes('inventory')) {
    await queryInterface.createTable('inventory', {
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
      product_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      batch_number: {
        type: Sequelize.STRING(60),
        allowNull: false
      },
      expiry_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      stock_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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

    await queryInterface.addIndex('inventory', ['business_id', 'product_id', 'batch_number'], {
      unique: true,
      name: 'idx_inventory_business_product_batch'
    });
  }

  // 5. Update Sales / Invoices Table
  await safeAddColumn('sales', 'total_amount', {
    type: Sequelize.DECIMAL(12, 2),
    allowNull: true
  });

  await safeAddColumn('sales', 'discount_amount', {
    type: Sequelize.DECIMAL(12, 2),
    allowNull: true
  });

  await safeAddColumn('sales', 'tax_amount', {
    type: Sequelize.DECIMAL(12, 2),
    allowNull: true
  });

  await safeAddColumn('sales', 'net_amount', {
    type: Sequelize.DECIMAL(12, 2),
    allowNull: true
  });

  await safeAddColumn('sales', 'payment_mode', {
    type: Sequelize.STRING(50),
    allowNull: false,
    defaultValue: 'CASH'
  });

  // 6. Update Sale Items / Invoice Items Table
  await safeAddColumn('sale_items', 'batch_number', {
    type: Sequelize.STRING(60),
    allowNull: true
  });

  await safeAddColumn('sale_items', 'unit_name', {
    type: Sequelize.STRING(20),
    allowNull: false,
    defaultValue: 'PCS'
  });

  await safeAddColumn('sale_items', 'free_quantity', {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0
  });

  await safeAddColumn('sale_items', 'conversion_factor', {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 1.00
  });

  await safeAddColumn('sale_items', 'total_base_quantity', {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0
  });

  await safeAddColumn('sale_items', 'total_price', {
    type: Sequelize.DECIMAL(12, 2),
    allowNull: true
  });

  // 7. Update Stock Movements Table
  await safeAddColumn('stock_movements', 'batch_number', {
    type: Sequelize.STRING(60),
    allowNull: true
  });

  // 8. Update Payments Table - support CREDIT
  try {
    await queryInterface.changeColumn('payments', 'payment_method', {
      type: Sequelize.ENUM('CASH', 'CARD', 'UPI', 'CREDIT', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'),
      allowNull: false,
      defaultValue: 'CASH'
    });
  } catch {
    // If dialect alteration differs, MySQL ALTER TABLE MODIFY
    try {
      await queryInterface.sequelize.query(
        "ALTER TABLE payments MODIFY COLUMN payment_method ENUM('CASH', 'CARD', 'UPI', 'CREDIT', 'BANK_TRANSFER', 'CHEQUE', 'OTHER') NOT NULL DEFAULT 'CASH';"
      );
    } catch {}
  }
};

export const down = async (queryInterface) => {
  try {
    await queryInterface.dropTable('product_units');
  } catch {}
  try {
    await queryInterface.dropTable('inventory');
  } catch {}
};

