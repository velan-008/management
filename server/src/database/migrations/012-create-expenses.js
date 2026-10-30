export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('expenses', {
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
    category: {
      type: Sequelize.STRING(80),
      allowNull: false
    },
    amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    expense_date: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    payment_method: {
      type: Sequelize.ENUM('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER'),
      allowNull: false,
      defaultValue: 'BANK_TRANSFER'
    },
    description: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    receipt_url: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    created_by: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
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

  await queryInterface.addIndex('expenses', ['business_id', 'expense_date'], {
    name: 'idx_expenses_date'
  });

  await queryInterface.addIndex('expenses', ['business_id', 'category'], {
    name: 'idx_expenses_cat'
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('expenses');
};
