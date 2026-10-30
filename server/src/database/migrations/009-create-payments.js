export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('payments', {
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
    amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    payment_method: {
      type: Sequelize.ENUM('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'),
      allowNull: false
    },
    reference_number: {
      type: Sequelize.STRING(100),
      allowNull: true
    },
    payment_date: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    notes: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  });

  await queryInterface.addIndex('payments', ['business_id', 'sale_id'], {
    name: 'idx_payments_business_sale'
  });

  await queryInterface.addIndex('payments', ['business_id', 'payment_date'], {
    name: 'idx_payments_date'
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('payments');
};
