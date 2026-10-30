export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('sale_items', {
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
    sale_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'sales',
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
      onDelete: 'RESTRICT'
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
      allowNull: false
    },
    unit_selling_price: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    refunded_quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    discount_percentage: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    discount_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    taxable_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax_rate: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    cgst_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    sgst_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    igst_amount: {
      type: Sequelize.DECIMAL(12, 2),
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
    }
  });

  await queryInterface.addIndex('sale_items', ['sale_id'], {
    name: 'idx_sale_items_sale_id'
  });

  await queryInterface.addIndex('sale_items', ['product_id'], {
    name: 'idx_sale_items_product_id'
  });

  await queryInterface.addIndex('sale_items', ['business_id'], {
    name: 'idx_sale_items_business'
  });

  await queryInterface.sequelize.query(`
    ALTER TABLE sale_items 
    ADD CONSTRAINT chk_refunded_quantity 
    CHECK (refunded_quantity <= quantity);
  `);
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('sale_items');
};
