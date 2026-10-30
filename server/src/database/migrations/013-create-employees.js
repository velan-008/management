export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('employees', {
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
    user_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    first_name: {
      type: Sequelize.STRING(60),
      allowNull: false
    },
    last_name: {
      type: Sequelize.STRING(60),
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
    designation: {
      type: Sequelize.STRING(80),
      allowNull: false
    },
    department: {
      type: Sequelize.STRING(80),
      allowNull: true
    },
    base_salary: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    joining_date: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('ACTIVE', 'ON_LEAVE', 'TERMINATED'),
      allowNull: false,
      defaultValue: 'ACTIVE'
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

  await queryInterface.addIndex('employees', ['business_id', 'status'], {
    name: 'idx_employees_business_status'
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('employees');
};
