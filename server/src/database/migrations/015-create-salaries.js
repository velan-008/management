export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('salaries', {
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
    employee_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    month: {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false
    },
    year: {
      type: Sequelize.SMALLINT.UNSIGNED,
      allowNull: false
    },
    base_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    bonus_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    deductions: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    net_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    payment_status: {
      type: Sequelize.ENUM('PENDING', 'PAID', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING'
    },
    payment_date: {
      type: Sequelize.DATEONLY,
      allowNull: true
    },
    payment_method: {
      type: Sequelize.ENUM('BANK_TRANSFER', 'CASH', 'CHEQUE', 'OTHER'),
      allowNull: false,
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

  await queryInterface.addIndex('salaries', ['business_id', 'employee_id', 'month', 'year'], {
    unique: true,
    name: 'idx_employee_month_salary'
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('salaries');
};
