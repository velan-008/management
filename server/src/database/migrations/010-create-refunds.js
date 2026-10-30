export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('refunds', {
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
      onDelete: 'RESTRICT'
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
    refund_number: {
      type: Sequelize.STRING(60),
      allowNull: false
    },
    refund_date: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    subtotal_refunded: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax_refunded: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    total_refunded: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    refund_method: {
      type: Sequelize.ENUM('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'STORE_CREDIT', 'ADJUSTMENT'),
      allowNull: false
    },
    reason: {
      type: Sequelize.STRING(255),
      allowNull: false
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

  await queryInterface.addIndex('refunds', ['business_id', 'refund_number'], {
    unique: true,
    name: 'idx_refunds_business_number'
  });

  await queryInterface.addIndex('refunds', ['business_id', 'sale_id'], {
    name: 'idx_refunds_business_sale'
  });

  await queryInterface.addIndex('refunds', ['business_id', 'refund_date'], {
    name: 'idx_refunds_date'
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('refunds');
};
