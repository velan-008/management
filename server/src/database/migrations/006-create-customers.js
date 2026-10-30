export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('customers', {
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
    email: {
      type: Sequelize.STRING(120),
      allowNull: true
    },
    phone: {
      type: Sequelize.STRING(25),
      allowNull: true
    },
    tax_number: {
      type: Sequelize.STRING(50),
      allowNull: true
    },
    address: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    state: {
      type: Sequelize.STRING(50),
      allowNull: true
    },
    credit_limit: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    outstanding_balance: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    store_credit: {
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

  await queryInterface.addIndex('customers', ['business_id', 'phone'], {
    name: 'idx_customers_business_phone'
  });

  await queryInterface.addIndex('customers', ['business_id', 'name'], {
    name: 'idx_customers_business_name'
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('customers');
};
