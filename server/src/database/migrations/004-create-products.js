export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('products', {
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
    category_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    name: {
      type: Sequelize.STRING(150),
      allowNull: false
    },
    sku: {
      type: Sequelize.STRING(60),
      allowNull: false
    },
    barcode: {
      type: Sequelize.STRING(80),
      allowNull: true
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    cost_price: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    selling_price: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    low_stock_threshold: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 5
    },
    tax_rate: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    unit: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'pcs'
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

  await queryInterface.addIndex('products', ['business_id', 'sku'], {
    unique: true,
    name: 'idx_products_business_sku'
  });

  await queryInterface.addIndex('products', ['business_id', 'barcode'], {
    name: 'idx_products_business_barcode'
  });

  await queryInterface.addIndex('products', ['business_id', 'category_id'], {
    name: 'idx_products_business_category'
  });

  await queryInterface.addIndex('products', ['business_id', 'quantity'], {
    name: 'idx_products_business_stock'
  });

  // Database check constraint to prevent negative stock
  await queryInterface.sequelize.query(`
    ALTER TABLE products 
    ADD CONSTRAINT chk_products_quantity_non_negative 
    CHECK (quantity >= 0);
  `);
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('products');
};
