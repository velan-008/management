export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('sales', {
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
    customer_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'customers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    user_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    invoice_number: {
      type: Sequelize.STRING(60),
      allowNull: false
    },
    invoice_date: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    subtotal: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    discount_total: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    order_discount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax_total: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    cgst_total: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    sgst_total: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    igst_total: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    round_off: {
      type: Sequelize.DECIMAL(6, 2),
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
    refunded_amount: {
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
    status: {
      type: Sequelize.ENUM('COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'COMPLETED'
    },
    notes: {
      type: Sequelize.TEXT,
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

  await queryInterface.addIndex('sales', ['business_id', 'invoice_number'], {
    unique: true,
    name: 'idx_sales_business_invoice_number'
  });

  await queryInterface.addIndex('sales', ['business_id', 'invoice_date'], {
    name: 'idx_sales_business_date'
  });

  await queryInterface.addIndex('sales', ['business_id', 'customer_id'], {
    name: 'idx_sales_business_customer'
  });

  await queryInterface.addIndex('sales', ['business_id', 'status'], {
    name: 'idx_sales_business_status'
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('sales');
};
